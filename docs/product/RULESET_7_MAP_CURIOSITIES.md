# Ruleset 7: map curiosities

**Status:** folded (`pulp_wars-737.7`). Every step of this spec is
implemented, and the rules, the Normal AI, and the presentation are
described as current rules in
[current rules section 2.7](RULESET_7_CURRENT.md#27-map-curiosities) and the
sections it names; where this document and the code differ, the code's
behavior is the rule and each difference is listed in
[current rules section 25](RULESET_7_CURRENT.md#25-known-discrepancies).
This document stays as design history (its values, tuning bounds, and
appendix are not maintained). The coarse check of bead 7 is the
[curiosities check](../validation/RULESET_7_CURIOSITIES_CHECK.md); it
changed no rule ([section 21](#21-coarse-check-and-fold-pulp_wars-7377)).

**History.** Design spec (`pulp_wars-737.1`, epic `pulp_wars-737`). Engine
step I (bead 2 of section 15: the option, placement, the Fountain, the
Shrine, and the Wreck) is implemented at `pulp-wars-poc-7r35`
(`pulp_wars-737.2`) and engine step II (bead 3: the Monster, its neutral
owner, and the owner-reader audit) at `pulp-wars-poc-7r36`
(`pulp_wars-737.3`); both are folded into
[current rules section 2.7](RULESET_7_CURRENT.md#27-map-curiosities), with
the notes of [section 17](#17-implementation-notes-pulp_wars-7372) and
[section 18](#18-implementation-notes-pulp_wars-7373). The art
(`pulp_wars-737.5`, [class document](../art/classes/curiosities.md)), the
UI (`pulp_wars-737.6`, bead 6, with the notes of
[section 19](#19-implementation-notes-pulp_wars-7376)), and the Normal AI
(`pulp_wars-737.4`, bead 4, no identity change; see
[section 20](#20-implementation-notes-pulp_wars-7374) and
[Normal AI: map curiosities](../architecture/NORMAL_AI.md#map-curiosities-pulp_wars-7374))
are implemented. It is an overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md) at `pulp-wars-poc-7r31`,
with the pending [Dwarf overlay](RULESET_7_DWARVES.md) and the pending
[Mind Control overlay](RULESET_7_MIND_CONTROL.md). Every rule this document
does not mention stays in force. Appendix A records the first draft, the
critique, and what the critique changed.

**Round 2** (`pulp_wars-737.12`, spec): sections 22 to 38 and Appendix B
add five more kinds (the Downed Saucer and the Graveyard, two neutral
camps; the Dimensional Gates; and two easter eggs, Bigfoot and the Wishing
Well) for beads `pulp_wars-737.13` to `pulp_wars-737.17`. Unlike sections 1
to 21, that part is a live spec; see
[section 22](#22-round-2-source-and-scope). The art (`pulp_wars-737.13`)
and the engine (`pulp_wars-737.14`, with the notes of
[section 39](#39-implementation-notes-pulp_wars-73714)) are implemented.

**Source.** The user, 2026-10-03: "figure out some more interesting random
things on the map. they are there to add color and occasional extra
tactical consideration. like random neutral monster roaming the map minding
its own business until aggro. or a fountain of youth which replenishes
health of a creature every turn. these types of things should be very rare
and there should be an option to disable them at map generation."

**Fixed by the user:** a roaming neutral monster that is peaceful until
provoked; a Fountain of Youth that heals a unit every turn; both very rare;
an option to switch them off at map generation. Everything else here is a
ruling of this spec, made to be simple, readable, and neutral on a board
without curiosities.

**Ruleset ID:** each engine bead takes the next free `pulp-wars-poc-7rNN`
(section 10.1). "The previous identity" is the one current before it.

## 1. Summary

A **curiosity** is a rare neutral feature that map generation drops on a
board: a few per large map, often none on a small one. There are four:

| Curiosity             | Where                   | One sentence                                                                                                                            |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Monster**           | land, boards 16 and up  | A Giant Spider owned by nobody wanders near its lair and, after every round, attacks the weakest unit that stood next to it or hurt it. |
| **Fountain of Youth** | Grass                   | A unit that starts its owner's turn on the Fountain heals 12 HP.                                                                        |
| **Shrine**            | Grass or Forest         | The first unit that could be Promoted and ends a Move on the Shrine is Promoted at once, and the Shrine is gone.                        |
| **Sunken Wreck**      | water (not on Dry Land) | The first unit afloat that ends a Move on the Wreck salvages 8 Coins for its owner, and the Wreck is gone.                              |

Killing the Monster pays a **bounty** of 10 Coins. Curiosities never change
a tile, never sit in anyone's territory, and never touch a city. A setup
field, **Curiosities** (on by default), switches them off; with it off, or
on a board that drew none, the generated map and the match are exactly what
the generator makes today.

## 2. Pillars

1. **Colour first, tactics second.** A curiosity is something to notice and
   tell a story about; it is a side objective or a hazard, never the reason
   a match is won.
2. **Very rare.** Small boards usually have none; the largest have two. No
   board has two curiosities of one kind.
3. **Every rule is visible and fits in one sentence** (the sentences of
   section 1 are the Help text). Everything a curiosity does is public on an
   explored tile; nothing hides.
4. **Simplicity.** No new command, no new terrain, no new status. The
   Monster is an ordinary unit with an owner nobody plays; the other three
   are tile markers that act through moves and Start Turn.
5. **Neutral when absent.** No curiosity, no change: the board, the match
   PRNG, entity IDs, and every decision of a match without one are those of
   the previous identity.

## 3. The option

| Item         | Ruling                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Setup field  | `MatchSetupV7.curiosities: boolean`, a required key (`SETUP_KEYS_V7` gains it). Any other value is `INVALID_SETUP`.                                                                                                      |
| Default      | `true`. The user asked for a way to **disable** them, so they are on unless switched off.                                                                                                                                |
| Showcase     | The fixed Showcase board never has curiosities, whatever the field. The browser launches a Showcase with `curiosities: false` (the precedent of its seed 0).                                                             |
| Setup screen | A checkbox **"Curiosities"** right under the Map description, checked by default, with the hint "Rare sights on the map: a wandering monster, a Fountain of Youth, a Shrine, a Wreck." Hidden while Showcase is the map. |
| Headless CLI | `--curiosities on` or `--curiosities off` for `match` and `batch` (default `on`, as in the browser); each batch entry records the value.                                                                                 |
| Tools        | Every existing parity, balance, and validation tool passes `curiosities: false` explicitly, so faction measurements stay comparable; the curiosity probe of the coarse-check bead (section 15) measures `true`.          |
| Independence | Like `factions`, the field never affects any other generated feature: two setups that differ only in `curiosities` generate byte-identical boards, capitals, villages, chests, turn orders, and match PRNG states.       |

**Byte-identical when off: achieved.** Curiosity placement runs after the
Rifts on the accepted board, draws only from its own stream (section 4.1),
never rejects a board, and never changes a tile: curiosities live in their
own state list, not in `TileStateV7`. The Monster is created after every
other initial entity, so it takes the last initial entity ID and shifts no
other ID. Therefore:

- `curiosities: false` gives exactly today's board, cities, units, entity
  IDs, chests, turn order, and match PRNG state, plus the empty new lists;
- `curiosities: true` gives the **same board tiles** too, plus the placed
  curiosities and, if a Monster was placed, one more unit;
- a match with `true` that drew no curiosity plays exactly like the same
  match with `false` (apart from the setup field), command for command.

## 4. Generation

### 4.1 When and with what randomness

- Placement runs on the accepted board of every generated map type, after
  the treasure chests and after the Rifts, only when `curiosities` is true.
- It draws from its **own Mulberry32 stream**, seeded with
  `seedFromText("pulp-wars-curiosities:" + seed)`, never from the match
  stream and never from the Rift stream. The stream is not stored: nothing
  draws from it after generation.
- It never rejects a board or retries the generator. A kind without a legal
  site is skipped, so a board may get fewer curiosities than its target.

### 4.2 How many

| Board width | Target count (the stream's first draw) | Expected |
| ----------: | -------------------------------------- | -------: |
|          11 | 1 with probability 1/3, otherwise 0    |     0.33 |
|          14 | 1 with probability 1/2, otherwise 0    |      0.5 |
|          16 | 1 (no draw)                            |        1 |
|          20 | 2 with probability 1/2, otherwise 1    |      1.5 |
|          25 | 2 (no draw)                            |        2 |

Each curiosity in turn: the **eligible kinds** are the kinds not yet placed
on this board, allowed by the board (the Monster needs width 16 or more; the
Wreck needs a non-Dry-Land map), and with at least one legal site on the
board as it stands. With none, placement stops. Otherwise one kind is drawn
by weight (**Monster 3, Fountain 3, Shrine 2, Wreck 2**, `nextBounded` over
the summed weights of the eligible kinds in that order), then one legal site
of that kind uniformly (`nextBounded` over the legal sites in `(y, x)`
order). So a board never has two curiosities of one kind, and at most one
Monster.

### 4.3 Where: every kind

A tile is a legal site only if all of these hold:

1. it is off the board's edge ring;
2. it holds no settlement site, treasure chest, resource, improvement, or
   Rift;
3. it is at Chebyshev distance **3 or more from every settlement center**
   (capital or village). Territory only ever reaches 2 from a center
   (footprint 3 x 3, Land Grant 5 x 5), so **no curiosity is ever in a
   city's territory**: nobody builds on it, fortifies on it, or captures it;
4. it is at distance **5 or more from every capital** and the difference
   between its largest and smallest distance to a capital is **at most 4**
   (no start is next to one, and it lies roughly between the starts);
5. it is at distance **5 or more from every curiosity already placed** (the
   Monster's home counts), so the Monster never reaches a unit standing on
   another curiosity (section 8.3: its reach is 3 from home);
6. **land kinds** (Monster, Fountain, Shrine): its eight-connected land
   component holds **two or more capitals, or none** (a shared continent or
   a neutral island, never one player's home island); on a shared landmass
   it must be reachable from a capital over land without Mountains (the
   treasure-chest rule), and a neutral island is reached by sea;
7. **the Wreck:** its eight-connected water component touches the landmass
   of every capital (orthogonal adjacency), so every player can sail to it.

### 4.4 Where: each kind

| Kind     | Terrain                                      | More                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monster  | Grass, Forest, or Mountain (its **home**)    | Width 16 or more. Distance **5 or more from every settlement center** (so its whole area, section 8.3, stays 3 or more from every center). Every tile within 2 of home is on the board; at least 12 of the 24 tiles around home are Grass, Forest, or Mountain. **No tile within 2 of home is a cut tile** of the land graph, with or without Mountains (removing it splits no land component), so the Monster can never block a corridor. |
| Fountain | Grass                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Shrine   | Grass or Forest                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Wreck    | Shallow or Deep Water with no Fish or Pearls | Not on Dry Land (it has no water).                                                                                                                                                                                                                                                                                                                                                                                                         |

The measured distribution (how often each kind and each count actually
appears per map type and size) is part of the engine beads' validation
(section 13.1); Archipelago boards will often have only the Wreck, because
condition 6 keeps land curiosities off home islands.

## 5. The Fountain of Youth

**One sentence:** a unit that starts its owner's turn on the Fountain heals
12 HP.

- **When.** At its owner's Start Turn, right after Windmill healing and
  before Troll regeneration ([current rules section 3](RULESET_7_CURRENT.md#3-players-turns-and-victory)),
  the active player's unit standing on a Fountain heals
  `min(FOUNTAIN_HEAL_V7, maxHp − hp)`, with `FOUNTAIN_HEAL_V7` = **12**:
  most units (12 HP or less) are back to full; a big body is not.
- **Who.** Any unit of the active player on the Fountain tile, in land form,
  of any faction: a flyer, a Thrall or controlled unit, an Undead unit (the
  Fountain is not recovery, so Restless does not apply), a plagued or bitten
  unit. **Never a construct** (the Dwarf Clockwork Gunner and Brass Titan
  mend only by Repair and Promotion,
  [Dwarf overlay section 7.2](RULESET_7_DWARVES.md#72-immunities-and-healing)),
  and never an Egg (an Egg is never on a Fountain: Eggs lie next to a city
  center, curiosities 3 or more from one). One tile, so at most one unit per
  Fountain per turn.
- **HP only.** It cures nothing (Plague, Bitten, and Chill stay; the
  Windmill precedent) and recharges no Shield. Plague resolves earlier in
  the Start Turn, so a plagued unit on the Fountain loses 2 and then heals.
- **It stacks** with Windmill healing (impossible in practice: a Windmill
  stands in territory, a Fountain never) and with Troll regeneration (which
  follows it). A unit on the Fountain also recovers by `RECOVER` or idle
  recovery like anywhere neutral (2, or none for a Restless Undead unit).
- **The tile.** A Fountain is Grass forever (nothing transforms it: it is
  never in territory). Units enter and stand on it normally; a Road may be
  built through it like any neutral land; a Grave may lie on it; it holds no
  resource, improvement, Field Defense, or Monument because it is never
  owned. Moving onto it does nothing; only standing there at Start Turn
  does.
- **Event.** `FOUNTAIN_HEALED { playerId, unitId, at, amount, hpAfter }`
  after `WINDMILL_HEALING_RESOLVED` and before `UNITS_REGENERATED`, only when
  `amount > 0`; projected like `WINDMILL_HEALING_RESOLVED`.

## 6. The Shrine

**One sentence:** the first unit that could be Promoted and ends a Move on
the Shrine is Promoted at once, and the Shrine is gone.

- **Claim.** The Shrine is claimed exactly when a treasure chest on that
  tile would be taken (a unit **ends a `MOVE`** there; passing over it,
  Push, a pull, Knockback, an advance, Beam Down, landing, a rising, a
  tunnel, or a placement does not), and only by an **eligible** unit: one
  for which `PROMOTE` would be legal if it had the kills, so a land-form
  unit that is not a veteran, not a growing unit (a dinosaur grows instead),
  and not a Thrall. An ineligible unit may stand on the Shrine and leaves it
  untouched.
- **Effect.** The ordinary Promotion: +5 maximum HP, a full heal, `veteran`
  true ([current rules section 10](RULESET_7_CURRENT.md#10-recovery-and-support));
  the unit's kills, statuses, Shield, and activation are unchanged (the Move
  that claimed it is still its Move). The unit can never Promote again.
- **Then** the Shrine leaves the board for good.
- **Events.** `SHRINE_CLAIMED { playerId, unitId, at }`, then
  `UNIT_PROMOTED { unitId, maxHp }`, right after the Move's `UNIT_MOVED` and
  before its reveals; projected to every viewer that has explored `at`.
- The Normal AI claims it like a chest (section 11). A Dinosaur seat can
  still claim it with a Caveman or a Shaman.

## 7. The Sunken Wreck

**One sentence:** the first unit afloat that ends a Move on the Wreck
salvages 8 Coins for its owner, and the Wreck is gone.

- **Claim.** A unit **afloat** (a boat, an embarked unit, or a Martian or
  Dwarf machine that self-launched there) that ends a `MOVE` on the Wreck
  tile. Passing over it does nothing; a pull or Knockback onto it does
  nothing.
- **Effect.** Its owner gains `WRECK_COINS_V7` = **8** Coins; the Wreck
  leaves the board. Event `WRECK_SALVAGED { playerId, unitId, at, coins }`
  after the Move's `UNIT_MOVED`, projected like `TREASURE_CAPTURED`.
- The tile stays ordinary water: a Wreck has no Fish or Pearls under it and
  is never a Port site (it is never in territory).

## 8. The Monster

**One sentence:** a Giant Spider owned by nobody wanders near its lair and,
after every round, attacks the weakest unit that stood next to it or hurt it.

### 8.1 A unit owned by nobody

- The Monster is an ordinary entry of `GameStateV7.units` whose `ownerId` is
  the reserved **neutral owner** `NEUTRAL_OWNER_ID_V7`, an ID that is never a
  seat (the engine bead picks the value; 0 if the ID space allows it). It is
  not a player: it has no entry in `players`, no seat, no Coins, no
  technology, no cities, no exploration, and it is never eliminated.
- It resolves through the **neutral registration**: a registration keyed
  outside `FACTION_IDS_V7` (so the frozen faction order, setup factions, and
  the one-faction-per-seat rule are untouched) that defines only the
  Monster's role. Its mechanical role is **`JUGGERNAUT`** (so every rule that
  names the `JUGGERNAUT` role treats it as a big body: immune to Mind
  Control, the Tractor Beam, and Shatter), with its own label, stats, and
  abilities (`ATTACK` only: no capture, Push, Pillage, or anything else).
  When the [Mind Control overlay](RULESET_7_MIND_CONTROL.md) has landed, a
  neutral unit's kind is the neutral registration and its technology is
  empty.
- **Hostile to everyone.** `arePlayersHostileV7(NEUTRAL, p)` is true for
  every player in both modes; nobody is ever allied to it. (Pitfall: today's
  `arePlayersAlliedV7` calls two non-human IDs in a Cooperative match
  allies; it must exclude the neutral owner.)
- It has **no home city** (an orphan, using no slot), `kills` counted as for
  any unit (they have no effect), `veteran` false, and it is never
  capture-eligible.

### 8.2 Stats

| Name         |  HP | Attack (`attack2`) | Defense (`defense2`) | Move | Range | Sight | Regeneration | Bounty |
| ------------ | --: | ------------------ | -------------------- | ---: | ----: | ----: | -----------: | -----: |
| Giant Spider |  24 | 3 (6)              | 2 (4)                |    1 |     1 |     — |            4 |     10 |

Constants `MONSTER_HP_V7` 24, `MONSTER_ATTACK2_V7` 6, `MONSTER_DEFENSE2_V7`
4, `MONSTER_HOME_RADIUS_V7` 2, `MONSTER_REGENERATION_V7` 4,
`MONSTER_BOUNTY_V7` 10. It has no Sight because it explores nothing; its
choices read the canonical board (section 8.4), and what players see of
them follows the ordinary projection (section 8.7).

Worked examples (engine formula, full HP, Grass; "dealt / taken back"):

| Monster attacks                | Result | Units attack the Monster (24 HP) | Result                         |
| ------------------------------ | ------ | -------------------------------- | ------------------------------ |
| Fighter (12, Defense 2)        | 8 / 4  | Fighter (Attack 2)               | 5 / 5                          |
| Raider (12, Defense 1)         | 10 / 1 | Knight (Attack 3)                | 8 / 4; three Knights kill it   |
| Guard (17, Defense 3)          | 7 / 7  | Catapult from 2–3                | 10 / none; three shots kill it |
| Knight, Captain, Catapult (10) | dead   | T-Rex or Juggernaut (Attack 4)   | 12 / 3                         |
| Goblin (6)                     | dead   | Battleship from 2–3              | 20 / none                      |
| Juggernaut (40, Defense 4)     | 6 / 10 | Fighter, Monster in a Forest     | 4 / 5 (cover 1.5)              |

So a lone early unit next to it is badly hurt or dead; a lone Fighter loses
a slugging match against its regeneration; three Knights, three Catapult
shots (over three rounds, out of its reach), or one Battleship and a finisher
kill it. That is the "occasional consideration": go around it, or hunt it
with a plan.

### 8.3 Home, area, and movement

- **Home** is the tile the Monster was placed on (its lair, drawn as a web).
  Its **area** is every tile within Chebyshev **2** of home.
- **Standable tiles** for the Monster: on the board, in its area, Grass,
  Forest, or Mountain (it climbs; never a Rift or water), at distance 3 or
  more from every settlement center (placement makes this true of the whole
  area; the rule states it anyway), with no unit, mound, or treasure chest
  (`tileOccupiedV7` plus the chest test). Curiosity tiles are never in its
  area (section 4.3 rule 5).
- It moves **one step** (to a Chebyshev neighbour that is standable), at
  most once per neutral turn, and only in the neutral turn. Every step costs
  one; no terrain stops it (it has Move 1 anyway); deep snow does not apply
  to a one-step move. It never enters territory (its area is never
  territory), never besieges, never captures, never takes a chest, Shrine,
  or Wreck, and **never advances** after a kill.
- **No zone of control.** It exerts none and ignores none (it moves one tile
  and nothing stops a one-tile step). Units may walk past it; they cannot
  walk through its tile (it is another owner's unit; a Martian or Dwarf
  flyer passes over it as over any unit).
- **Reach.** Since it moves one step inside its area and then attacks at
  range 1, it can attack any tile within 1 of a standable tile next to it:
  at most 2 from where it stands and 3 from home. With its home 5 or more
  from every settlement center, it never reaches a unit on a center or on a
  center's first ring (where Eggs lie and capturers wait).

### 8.4 Provocation and the attack

A unit **provokes** the Monster when, at the Monster's turn, it is on the
board and either:

- **stands next to it** (Chebyshev 1), in any form (land, embarked, or
  naval: land units may attack afloat units from shore); or
- is listed in the Monster's **`provokedBy`**: every unit that dealt it
  damage since its previous turn, by any attack or ability (an `ATTACK`,
  splash, Pierce, Sweep, Wail, a bomb, a Bomb Run, an Eruption). Kabooms and
  death blasts are made by units that are dead by then, and Plague cannot
  reach it, so they record nobody.

On its turn the Monster **attacks the weakest provoker it can reach**:

1. Candidates are the provokers it can attack this turn: adjacent now, or
   adjacent to a standable tile next to it (it steps, then attacks).
2. It picks the one with the **lowest HP**, ties broken by the lowest unit
   ID. A Martian Shield does not count; HP does.
3. If the target is not adjacent, it steps to the first standable tile next
   to it that is adjacent to the target, in `(y, x)` order.
4. It attacks with the ordinary `ATTACK` resolution
   ([current rules section 13](RULESET_7_CURRENT.md#13-combat-and-fortification)):
   damage both ways, retaliation (it has no splash), kill credit,
   deaths, Graves, risings, death-blast chains, Plunder, and the economy
   tail. It never advances and never pushes.

With **no reachable provoker** it **wanders**: it takes one step to a
standable neighbour or stays, each option equally likely (the options are
"stay" followed by the standable neighbours in `(y, x)` order). The draw is
**stateless**: one `nextBounded` on
`randomState(seedFromText("pulp-wars-monster:" + seed + ":" + round + ":" + unitId))`.
So it needs no stored stream, never touches the match PRNG, and a replay
reproduces it exactly.

`provokedBy` is cleared at the end of each of its turns. A unit that hits
it from beyond its reach (a Catapult at range 3, a Battleship) is listed but
is not a candidate: it simply cannot be reached.

### 8.5 The neutral turn

The Monster acts once per round, **after the last seat's turn**: inside the
`END_TURN` that wraps the round (after `TURN_ENDED`, before the next
round's first Start Turn), whoever is last in turn order (eliminated seats
are skipped as usual). Steps:

1. `NEUTRAL_TURN_STARTED { round }` (the round that just ended).
2. Each Monster on the board, in unit-ID order: reset its activation; then
   attack or wander (section 8.4). Each attack is resolved and its events
   are emitted before the next Monster acts.
3. Each surviving Monster regenerates `min(4, maxHp − hp)`
   (`MONSTER_REGENERATED { unitId, amount, hpAfter }` when `amount > 0`),
   and its `provokedBy` is cleared.
4. The naval blockade and sea-network events (a Monster attack can kill a
   blockader), then `NEUTRAL_TURN_ENDED { round }`, then the next seat's
   Start Turn as usual.

The first neutral turn follows round 1. A match without a Monster has no
neutral turn and emits neither event. The neutral turn never ends a match
by itself: the Monster captures nothing, so it eliminates no one.

### 8.6 What affects the Monster

**The rule:** every effect that damages a hostile unit damages the Monster;
**no status sticks to it and nothing moves it**. In detail:

| Effect                                                                                                      | On the Monster                                                                                   |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Attacks of every unit, retaliation, splash, Pierce, Sweep, Wail, Kaboom, death blasts, Bomb Runs, Eruptions | ordinary damage (cover 1.5 on Forest or Mountain; never fortified: it is never in its territory) |
| Gang Up, Charge, Inspired, Acid, Wallbreaker, the Disintegrator, Boulders, Lifesteal, Unflinching           | ordinary (they change the attacker's numbers)                                                    |
| Plague, Bitten, Infect, Chill (so no sluggish turn and no Shatter), Mind Control                            | **immune**: never applied, never spread to it; a Zombie that kills it gets no rising             |
| Push, the Charge! push and follow, the Tractor Beam, Knockback                                              | **immune**: never moved (`BLOCKED` in previews, no push)                                         |
| Healing (Windmill, Fountain, Tend Wounded, Repair, Recover)                                                 | none; it only regenerates 4 at the end of its turn                                               |
| Death                                                                                                       | ordinary `UNIT_DIED`; a Grave in a match with an Undead seat (land, not a site); no rising       |

The immunities are read from the neutral registration, not from the role:
`JUGGERNAUT` already covers Mind Control, the Tractor Beam, and Shatter, and
the registration adds the status and push immunities.

### 8.7 Death, kill credit, and the bounty

- Its death is credited by the ordinary table
  ([current rules section 18.9](RULESET_7_CURRENT.md#189-kill-credit-plunder-and-friendly-fire)):
  the attacker, the retaliating defender (when the Monster dies attacking),
  the splash, Pierce, or Sweep attacker, the Banshee, the exploding unit's
  owner (a blast: player credit, no unit credit), the Mole (an Eruption),
  or the Gyrocopter (a bomb).
- **Bounty.** The credited player gains `MONSTER_BOUNTY_V7` = **10** Coins.
  Event `MONSTER_BOUNTY_AWARDED { playerId, unitId, coins }`, owner-only (the
  Plunder precedent), right after `PLUNDER_AWARDED`. Nobody gets a bounty if
  nobody is credited.
- **Ordinary kill credit.** The killing unit counts the kill (Promotion,
  growth: a dinosaur that kills the Monster grows; **Slayer** counts it like
  any kill); a Goblin seat with Plunder gains its 1 Coin too. No achievement
  counts the Monster specially, and a Monster's own kills count for nobody.
- **No respawn.** A dead Monster is gone for the match; its web goes with it.
  Its `monsters` entry is removed.
- Kills **by** the Monster are credited to no player: no Plunder, no
  promotion credit for anyone; the victim leaves its Grave or rising as for
  any `ATTACK` death.

### 8.8 Fog and visibility

- The Monster is visible exactly like any unit: on a tile the viewer has
  explored. Its home and `provokedBy` (filtered to units the viewer can see)
  are public on a visible Monster (`PlayerViewV7.monsters`).
- Its events are projected by the ordinary rules: `UNIT_MOVED` and
  `COMBAT_RESOLVED` to viewers who see a unit involved before or after;
  `NEUTRAL_TURN_STARTED` and `NEUTRAL_TURN_ENDED` to everyone (they say only
  that the wilds took their turn, so the UI can pace the playback).
- Its target choice reads the canonical board, so it can attack a unit the
  attacker's opponents cannot see; the event projection hides that unit from
  them as for any attack on a hidden unit.

### 8.9 Determinism, saves, and replays

The neutral turn is part of the `END_TURN` reduction: same state, same
command, same result, with the stateless wander draw (section 8.4). The
`monsters` list is hashed, saved, and replayed. No elapsed time or UI state
affects it.

## 9. Interactions

| Rule or faction        | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cities, capture, siege | No curiosity is ever in territory or within 2 of a center. The Monster never stands within 2 of a center, so it never besieges, never blocks training or a capture, and never reaches a unit on a center or a nest tile. Curiosities cannot be captured, pillaged, or redeveloped.                                                                                                                                                                                                                                                                 |
| Movement, ZOC          | Curiosity tiles are ordinary to enter. The Monster exerts no ZOC; it blocks its own tile only. Placement guarantees it never stands on a cut tile, so no land route is ever closed by it.                                                                                                                                                                                                                                                                                                                                                          |
| Treasure chests        | Curiosities are placed after chests and never on one. A chest may lie in a Monster's area ("treasure guarded by a spider"); the Monster never steps on it, a unit that takes a chest next to the Monster provokes it, and so does a treasure unit placed next to it.                                                                                                                                                                                                                                                                               |
| Healing, Promotion     | The Fountain heals 12 (section 5); the Shrine promotes (section 6). The Monster takes no healing and never Promotes.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Human                  | Ordinary. A Knight that kills the Monster advances onto its tile and may Overrun. A Raider may Escape after hitting it; it stays in `provokedBy` and is attacked if still in reach. Field Defense never stands in the Monster's area (never territory).                                                                                                                                                                                                                                                                                            |
| Undead                 | Wail, Lich splash, and Vampire attacks damage it (Lifesteal heals by the damage). It is never plagued, bitten, or infected: a Zombie that kills it raises no Zombie. Its death leaves a Grave (in an Undead match) that a Necromancer may raise. An Undead unit heals on the Fountain (not recovery, so Restless does not stop it).                                                                                                                                                                                                                |
| Goblin                 | Gang Up counts Goblin helpers around it; Kaboom and death blasts hit it; a Goblin seat with Plunder gains 1 Coin plus the bounty when credited. The Monster's kill of an exploding unit sets off the blast, which may hit the Monster.                                                                                                                                                                                                                                                                                                             |
| Dinosaur               | Its kill grows a dinosaur. Charge! damages it but never pushes it, so the Triceratops does not follow. Eggs are never next to it (Eggs lie within 1 of a center). Dinosaurs (the growing roles) cannot claim a Shrine; Cavemen and Shamans can.                                                                                                                                                                                                                                                                                                    |
| Martian                | Immune to Mind Control (also under the Mind Control overlay) and the Tractor Beam; Shields absorb its hits as any hit. Flyers pass over it, can stand next to it (and then provoke it), and can claim a Shrine (a Saucer is not a Thrall). A Tractor Beam pull that leaves an enemy next to the Monster makes that enemy a provoker (feeding an enemy to the spider is legal play), and a unit beamed down next to it provokes it too. A machine that self-launches onto the Wreck salvages it. A Thrall or controlled unit heals on the Fountain. |
| Ice Folk               | Immune to Chill (Bolas, Cold Snap, and the Cold Aura skip it), hence never sluggish and never shattered. Snow cover never applies to it; the Blizzard's halving protects only Ice Folk units. Its area may be Snow (it ignores Snow: it moves one tile).                                                                                                                                                                                                                                                                                           |
| Dwarf                  | A mound is occupied ground: the Monster never steps onto one. An Eruption damages it (the Mole provokes it, and is next to it after surfacing anyway); a Bomb Run damages it and provokes the Gyrocopter. Knockback never moves it. Constructs are not healed by the Fountain; Dig In never applies in its area (never next to an own center). A Clockwork Gunner may claim a Shrine.                                                                                                                                                              |
| Rift                   | No curiosity is on a Rift; the Monster never stands on one. A Rift may lie in its area and is simply not standable.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Naval                  | A boat or transport next to the Monster on the shore provokes it and is attacked from the shore (embarked Defense 1 hurts). Boats attack it from the sea; a Battleship at range 2–3 is out of its reach. Only an afloat unit salvages the Wreck.                                                                                                                                                                                                                                                                                                   |
| Achievements           | Slayer counts a Monster kill like any kill; Explorer, Muster, Land Baron, Sea Dog, Conqueror, and Engineer ignore curiosities. A Promotion from the Shrine resets nothing.                                                                                                                                                                                                                                                                                                                                                                         |
| Elimination, outcome   | Unchanged: the Monster is not a player, holds no city, and never counts for victory or defeat.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## 10. Engine impact

### 10.1 Identity and compatibility

- Two engine beads (section 15), each a new identity: the first adds the
  option, the placement, the Fountain, the Shrine, and the Wreck; the second
  adds the Monster and its placement weight. Earlier identities are
  rejected, never migrated; each appends the previous identity to
  `PRIOR_RULESET_7_IDS` and moves the autosave key.
- Map revision `REGIONAL_BIOMES_NAVAL_V2` is unchanged: no tile changes.
  Generation rules gain `CURIOSITIES` (current) after `RIFTS` for parity
  calls; `RIFTS` reproduces the generator before this overlay.

### 10.2 State

| Field                      | Shape                                                                               | Notes                                                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MatchSetupV7.curiosities` | `boolean`                                                                           | required key; hashed with the setup                                                                                                                                                                    |
| `GameStateV7.curiosities`  | `{ kind: "FOUNTAIN" \| "SHRINE" \| "WRECK", at }[]`, sorted by `(y, x)`             | Shrines and Wrecks are removed when claimed. Parsing rejects an entry with `curiosities: false` or on the Showcase, a duplicate tile, a tile breaking section 4.3 rule 2 or 3, or the wrong terrain.   |
| `GameStateV7.monsters`     | `{ unitId, home, provokedBy: UnitId[] }[]`, sorted by `unitId`; `provokedBy` sorted | one entry per Monster on the board. Parsing rejects an entry without a neutral-owned unit, a neutral unit without an entry, a Monster off its standable tiles, and a `provokedBy` ID not on the board. |
| `UnitStateV7.ownerId`      | may be `NEUTRAL_OWNER_ID_V7`                                                        | only for a unit listed in `monsters`                                                                                                                                                                   |

No other field. Both lists are empty with `curiosities: false`, so such a
state serializes as before apart from the new empty lists and the setup key.

### 10.3 Commands and events

- **No new command.** Claims happen inside `MOVE`; healing inside Start
  Turn; the Monster inside `END_TURN`. Any command naming the Monster as its
  `unitId` is rejected with the ordinary foreign-unit error and never
  offered.
- **Events** (`DOMAIN_EVENT_KIND_ORDER_V7` places each next to its
  precedent): `FOUNTAIN_HEALED` (after `WINDMILL_HEALING_RESOLVED`),
  `SHRINE_CLAIMED` (before `UNIT_PROMOTED`), `WRECK_SALVAGED` (after
  `TREASURE_CAPTURED`), `NEUTRAL_TURN_STARTED`, `NEUTRAL_TURN_ENDED`,
  `MONSTER_REGENERATED` (after `UNITS_REGENERATED`), and
  `MONSTER_BOUNTY_AWARDED` (after `PLUNDER_AWARDED`). The Monster's own move
  and attack reuse `UNIT_MOVED`, `COMBAT_RESOLVED`, and the death events.
- **Blockade list.** `END_TURN` is already on the naval recompute list, which
  covers a blockader the Monster kills.

### 10.4 Public queries and previews

- `PlayerViewV7.curiosities` (the explored subset) and
  `PlayerViewV7.monsters` (visible Monsters: `unitId`, `home`, and
  `provokedBy` filtered to visible units).
- `previewMonsterV7(view, unitId)` for a visible Monster: `home`, `area`
  (its standable tiles as far as the viewer has explored them),
  `provokeTiles` (the tiles next to it now: ending there provokes it),
  `reachTiles` (every tile it could attack this turn after one step),
  `provokers` (visible provokers now), and `likelyTarget` (the weakest
  visible provoker in reach, or null; `exact` is false when an unexplored
  tile is within 2 of it, since a hidden provoker could be weaker).
- `queryCombatPreviewV7` accepts the Monster as a target (it is a hostile
  visible unit) and adds `monsterRetaliates: boolean` (true when, after this
  attack, the attacker would be in the Monster's reach on its next turn). Its
  `push` is `BLOCKED` against a Monster.
- `queryThreatenedTilesV7` adds each visible Monster's `provokeTiles` (a
  unit there will be attacked unless something weaker is in reach); it does
  not add the full reach, since standing in reach without provoking is safe.
- The command query, the movement query, and every Kaboom, Wail, and
  explosion preview include the Monster as a hostile visible unit, with the
  immunities of section 8.6.

### 10.5 The neutral-owner audit (the main risk)

Every reader that resolves a unit's owner (`requirePlayer`,
`playerFactionV7`, `unitRoleRuleV7`, `unitRoleMechanicsV7`, technology
capabilities, relationship checks, views, projection, the leaderboard,
achievements, the AI) must either handle `NEUTRAL_OWNER_ID_V7` or provably
never see it. As in the Dwarf unit-reader classification
([Dwarf overlay section 5.2](RULESET_7_DWARVES.md#52-burrowed-units-state-and-the-one-accessor)),
a checked-in table classifies every such call site as **neutral-aware** or
**player-only** (reached only with a seat's own unit, for example because
the actor is the active player), and a test fails when a new call site
appears unclassified. Neutral-aware readers resolve the registration and an
empty technology list; player-only readers assert. The engine bead also adds
a fuzz test that runs Normal matches with a Monster placed next to every
faction's units.

## 11. Normal AI

Everything is read from the public view and the previews above; nothing
uses the wander draw or hidden state.

- **Avoid the Monster unless strong.** A routine Move never ends on a
  visible Monster's `provokeTiles`, and a unit already there with no attack
  steps away when it can. Normal attacks a Monster only when (a) this turn's
  offered attacks, combined, are predicted to kill it (valued at the bounty
  plus the ordinary kill value), or (b) the attack is from outside its reach
  (`monsterRetaliates` false) and deals more than its regeneration (4), by a
  unit with no better target this turn. It never sends a sole city defender.
- **Threat.** The threat estimate adds a visible Monster as a threat to
  every own unit standing on its `provokeTiles` or listed in its
  `provokedBy` within its `reachTiles`, with the ordinary damage estimate.
- **Fountain.** A land unit at half HP or less, not a construct, within two
  turns' route of a free visible Fountain that no visible enemy can reach
  this turn, and not a sole city defender, walks there and stands until it
  has healed; the Fountain counts as recovery in the campaign's retreat
  logic.
- **Shrine and Wreck.** An unclaimed visible Shrine is an objective like a
  treasure chest for the nearest eligible unit within 4 route steps that is
  not a sole defender and not the last capturer of a planned capture; a
  visible Wreck is an objective for the nearest afloat unit within 4 water
  steps, and an idle Patrol Boat may sail for it.
- **Gating.** Every curiosity heuristic runs only when the view has a
  curiosity or a Monster, so matches without one keep their decisions and
  pinned hashes byte for byte.
- Normal never uses the Monster on purpose (no luring, no feeding enemies to
  it); a human may.

## 12. UI and art

### 12.1 UI

- **Setup:** the "Curiosities" checkbox (section 3), remembered in the draft
  like the other choices.
- **Board:** the Monster as a unit with no faction colour (a neutral earth
  tone base, so it never reads as a player's unit); its web on `home`; when
  the Monster or its tile is selected, its area outlined and its
  `reachTiles` shaded. When an own unit is selected, Move destinations on a
  Monster's `provokeTiles` carry a warning glyph, and the Move preview says
  "Ends next to the Giant Spider: it will attack after this round."
- **Tiles:** the Fountain, Shrine, and Wreck overlays on explored tiles;
  the selected-tile panel names each and gives its one sentence.
- **Panels:** the Monster's unit panel shows its stats, "Owned by nobody",
  its regeneration, its bounty, and its current provokers.
- **Combat preview:** `monsterRetaliates` reads "The spider will strike
  back next round" when true.
- **Neutral turn:** played back like an AI turn, with a short banner "The
  wilds stir" and the Monster's move and attack animated; skipped in
  silence when nothing visible happened.
- **Help:** a "Curiosities" page with the four sentences of section 1, the
  bounty, and the setup option. The event log names each claim and the
  bounty.

### 12.2 Art (PixelLab, chibi direction)

Production art is generated in the art bead under the
[chibi direction](../art/CHIBI_ART_DIRECTION.md) and its PixelLab rules;
the art bead writes `docs/art/classes/curiosities.md` first.

| Asset                       | Kind                                      | Notes                                                                                      |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `UNIT:MONSTER_GIANT_SPIDER` | unit sprite, the ordinary unit sizes      | Hairy, big-eyed, chibi; earthy browns and a bone white, none of the seven faction colours. |
| Giant Spider portrait       | unit panel portrait                       | Same palette.                                                                              |
| `CURIOSITY:WEB`             | 80 x 80 overlay under the Monster's home  | Ground web and a few bones; must read under a unit.                                        |
| `CURIOSITY:FOUNTAIN`        | 80 x 80 overlay on Grass                  | Small stone basin with bright water; reads with a unit standing on it.                     |
| `CURIOSITY:SHRINE`          | 80 x 80 overlay on Grass and Forest       | Small stone shrine with a glowing idol.                                                    |
| `CURIOSITY:WRECK`           | 80 x 80 overlay on Shallow and Deep Water | A broken mast and hull ribs; transparent water.                                            |
| Four Help and legend icons  | UI icons                                  | Cut from the overlays.                                                                     |

**LEGACY look and the fallback:** code-drawn markers (a basin glyph, a
shrine glyph, a mast glyph, a web glyph, and a neutral disc with a spider
glyph for the Monster), the precedent of the Ice Folk Snow in LEGACY; the UI
bead ships them first, so the rules are playable before the art lands.

## 13. Test plan

### 13.1 Generation and the option

- **Off is today.** For seeds 0–31, every AI count, every legal size, and
  every generated map type: `curiosities: false` reproduces the previous
  identity's board, capitals, villages, chests, turn order, entity IDs, and
  match PRNG byte for byte (the generator under `RIFTS`).
- **On changes no tile.** Same matrix: `curiosities: true` has exactly the
  same tiles as `false`; the only differences are `curiosities`, `monsters`,
  the Monster unit, and `nextEntityId`.
- **Placement rules.** Every placed curiosity satisfies sections 4.3 and 4.4
  (a checker independent of the placement code); no Showcase has one; the
  same setup gives the same curiosities.
- **Distribution.** A validator prints the count per map type and size (the
  Rift table precedent) and the kind frequencies; recorded in the bead.
- **Setup parsing.** Missing, non-boolean, or extra keys are refused.

### 13.2 Rules

- Fountain: heals 12 or to full; never a construct or an Egg; only the
  active player's unit; event order with Windmill and Troll healing; Plague
  first; projection.
- Shrine: claimed by an eligible unit's `MOVE` only; not by passing, Push,
  pull, Knockback, advance, Beam Down, landing, risings, tunnels, or a
  dinosaur or Thrall or veteran; Promotion effect; removal; events.
- Wreck: claimed by a boat, an embarked unit, and a self-launched machine
  ending a Move on it; not by passing or a pull; 8 Coins; removal.
- Monster, one test per row of sections 8.4 to 8.7 and per row of section
  9: hostility in Rival and Cooperative modes; candidates (adjacent,
  `provokedBy` in and out of reach, ties by HP then ID, Shield ignored);
  the step choice; the wander options and the stateless draw; the area and
  the center distance; no ZOC; occupancy and pass-through (flyers pass
  over); every damage source records `provokedBy`; every immunity; the
  regeneration; the bounty per credit cause, Plunder, growth, Promotion
  credit, Slayer; Graves; no rising; the neutral turn's place in `END_TURN`
  with an eliminated last seat; events and projection with hidden units.
- **Neutral-owner audit:** the classification test (section 10.5) and the
  fuzz matches.
- **Saves and replays:** round trips with every curiosity and a Monster
  mid-match; hashes stable.

### 13.3 AI and headless

- Normal never ends a routine Move on `provokeTiles`; attacks a Monster
  only under section 11 (a) or (b); walks a wounded unit to a safe
  Fountain; claims Shrines and Wrecks; never moves a sole defender for any
  of them.
- Matches without curiosities: Normal decisions and pinned hashes unchanged.
- Headless `match` and `batch` with `--curiosities on` complete with no
  structured failure across every map type, size, and faction mix of the
  coarse-check matrix.

### 13.4 UI

- Setup control default, persistence in the draft, Showcase hiding, and the
  launched setup's field; drawing of every curiosity and the Monster in the
  default and LEGACY looks; the provoke warning; the neutral-turn playback;
  Help; a browser smoke probe on a seeded board that has every kind.

## 14. Acceptance criteria

1. With `curiosities: false`, generation and every pinned match of the
   previous identity are reproduced (apart from the identity and the setup
   key); with `true`, no tile differs.
2. Every placed curiosity obeys section 4; counts follow section 4.2 within
   the skips that legal sites force; no Showcase curiosity.
3. Every rule of sections 5–9 is implemented and tested, with exact public
   previews for what the viewer can see.
4. No reader of a unit's owner can crash or misjudge on the neutral owner
   (section 10.5 test green).
5. Normal plays matches with curiosities to completion without failures,
   avoids feeding units to the Monster, and uses the Fountain, Shrine, and
   Wreck as in section 11; matches without curiosities are byte-identical
   to before.
6. The setup checkbox, the headless flag, the board drawing, the warnings,
   the Help page, and the art (or its LEGACY fallback) are live.
7. The coarse check (section 15, bead 6) finds no faction pairing whose
   win rate moves by more than 5 percentage points between `on` and `off`,
   the Monster is slain in a majority of the matches that have one by round
   60, and match length changes by less than 10%.

## 15. Implementation beads

| #   | Bead                                                                  | Scope                                                                                                                                                                                                                                                         | Validation profile                    | Depends on                      |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| 1   | Spec (this document)                                                  | —                                                                                                                                                                                                                                                             | `docs/tracker`                        | —                               |
| 2   | Engine I: the option, placement, Fountain, Shrine, Wreck              | Setup field and parsing, headless flag, placement of the three static kinds (weights without the Monster), state lists, Start Turn and `MOVE` hooks, events, views, previews, parity tests, distribution validator, identity bump.                            | `ai/map/persistence`                  | 1                               |
| 3   | Engine II: the Monster                                                | Neutral owner and registration, the owner-reader audit and its test, placement weight 3, the neutral turn, provocation, wander, immunities, bounty, `monsters` list, `previewMonsterV7`, combat-preview field, threatened tiles, fuzz matches, identity bump. | `ai/map/persistence`                  | 2                               |
| 4   | Normal AI: curiosities                                                | Section 11, gated; tests of section 13.3.                                                                                                                                                                                                                     | `ai/map/persistence`                  | 3                               |
| 5   | Curiosity art                                                         | Class doc, PixelLab recipe and review for section 12.2.                                                                                                                                                                                                       | `asset-only`                          | 1, and open question 2 answered |
| 6   | UI: setup option, drawing, warnings, neutral turn, Help; art wired in | Section 12.1 with the LEGACY markers first, then the art of bead 5; smoke probe.                                                                                                                                                                              | `ui/presentation` (+ `smoke:browser`) | 3, 5                            |
| 7   | Coarse check and fold                                                 | The curiosity probe (on versus off), tuning inside the bounds of section 16, acceptance criterion 7, and the fold into the current rules.                                                                                                                     | `cross-cutting/release`               | 4, 6                            |

Tuning bounds for bead 7: Monster HP 20–30, Attack 2.5–3.5, bounty 6–12,
regeneration 2–4; Fountain heal 8 to a full heal; Wreck 5–10 Coins; the
count table of section 4.2 by at most one step per size.

## 16. Open questions for the user

1. **Fountain: "replenishes" literally?** The spec heals 12 per turn (a full
   heal for most units), because a full heal turns a 40-HP Juggernaut-class
   unit on the Fountain into a fortress nobody can kill in one round
   (appendix A, C1). Keep 12, or heal fully as you described?
2. **The monster is a Giant Spider** (a silhouette no faction has, and a
   web that explains why it stays home). Fine, or another pulp monster (a
   giant ape, a giant crab)? Only the art and the name change.
3. **Rarity.** About one curiosity on a 16 x 16 map, none on half of the
   small maps, two on 25 x 25. Rare enough?

Root defaults applied by engine step I: the Fountain heals 12, the Monster
is a Giant Spider, the rarity table of section 4.2 as written, and the
option on by default.

## 17. Implementation notes (`pulp_wars-737.2`)

Engine step I landed at `pulp-wars-poc-7r35`. Where this spec was silent or
predates the code, the implementation rules as follows:

- **Missions.** The `MISSION` map type (`7r34`) postdates this spec. A
  mission setup carries the key like every setup but must be `false`
  (`INVALID_SETUP` otherwise; `missionMatchSetupV7` builds `false`), and a
  mission board never has curiosities; the headless CLI refuses
  `--curiosities` with `--map-type mission`. The Showcase accepts either
  value and has none (section 3).
- **Thralls.** Section 6's "not a Thrall" is moot since the Mind Control
  revision (`7r33`): a controlled unit is Promoted by its kind's rules, so
  it may claim a Shrine. Eligibility is `form === "LAND"`, not a veteran,
  and not a growing role (`shrineEligibleV7`).
- **Claims need a step onto the tile.** A Shrine or Wreck is claimed by a
  `MOVE` whose traversed path is not empty and ends on it (a unit already
  standing there, for example after a push, claims nothing until it leaves
  and comes back).
- **Shrine veterans.** The state schema's "a veteran has at least three
  kills" holds unless the setup has the option on (on a generated map),
  where a Shrine veteran may have none.
- **Parsing** also rejects an entry on the edge ring and an unknown kind
  (the Monster is never a tile marker).
- **Land components** (section 4.3 rules 6 and 7) exclude Rift tiles, as
  the Rift's own connectivity rule does.
- **Weights without the Monster.** Until bead 3, the eligible kinds are
  drawn with Fountain 3, Shrine 2, Wreck 2; the Monster's 3 (first in the
  order) changes the draws when it lands, under its own identity.
- **Headless.** `runAiBatchV7` requires `curiosities` (so every caller
  states it), each batch entry records it, and the metrics gain
  `curiosityKinds`. The generation rules gain `CURIOSITIES` (current) after
  `RIFTS`.
- **Previews.** Engine step I adds no preview: the curiosities are in the
  public view (`PlayerViewV7.curiosities`); the Monster previews of section
  10.4 belong to bead 3.
- **Measured distribution** (seeds 0–31, every map type, size, and AI count;
  `npm run validate:ruleset7-curiosity-maps`): the targets of section 4.2
  hold where sites exist, but rule 3 (3 from every center) with rule 4
  (between the capitals) leaves some village-dense boards with no legal
  site: a third of the 16 x 16 Dry Land boards and 15–20% of the 20 x 20 and
  25 x 25 Lakes boards get none. On Continents and Archipelago boards about
  85% of the curiosities are Wrecks (land kinds stay off home islands), as
  section 4.4 expected. Totals over the 1920 boards: Fountain 523, Shrine
  520, Wreck 813 (before the Monster joined the draw at `7r36`; see
  section 18).

## 18. Implementation notes (`pulp_wars-737.3`)

Engine step II landed at `pulp-wars-poc-7r36`. Where this spec was silent,
the implementation rules as follows:

- **The neutral owner and kind.** `NEUTRAL_OWNER_ID_V7` is 0 (seats are 1
  to 4). `unitFactionV7` returns the kind `"NEUTRAL"` for a neutral unit
  (its result type widened from `FactionIdV7` to `UnitKindV7`, so every
  reader that indexes a faction table had to handle it, and did, at
  compile time); `unitRoleRuleV7`, `unitRoleMechanicsV7`, and
  `unitCapabilitiesV7` resolve the registration
  (`NEUTRAL_MONSTER_ROLE_RULE_V7`, the Juggernaut's mechanics with no
  advance, and the capabilities of the empty technology list);
  `factionRulesV7("NEUTRAL")` has every faction rule off;
  `ownerResearchedTechsV7` is the owner's research, empty for the neutral
  owner. The unit's `role` is `JUGGERNAUT`, so the existing `JUGGERNAUT`
  role checks (Mind Control, the Tractor Beam, Knockback, Shatter) apply
  unchanged; the status immunity is `unitTakesStatusV7` (the owner, not the
  role) and the displacement immunity is in the one Push-condition helper.
- **One alliance rule.** The canonical relationship helpers and the four
  public copies (movement, queries, the Normal AI, the mission directives)
  now share `cooperativeAlliesV7`, which never allies the neutral owner;
  the owner-reader audit keeps any new ad hoc `"COOPERATIVE"` test from
  appearing unclassified.
- **The owner-reader audit** (section 10.5) scans the engine, the Normal
  AI, and the headless runner for `requirePlayer`, `playerFactionV7`,
  `seatRoleRuleV7`, and `seatRoleMechanicsV7` calls, owner-keyed lookups
  on a `players` list or a player map, and `"COOPERATIVE"` mode tests, and
  classifies each enclosing function as `NEUTRAL_AWARE` (its text names the
  neutral owner; checked), `NEUTRAL_SAFE` (a missing player already gives
  the neutral answer), or `PLAYER_ONLY` (a seat's ID only; the readers
  throw otherwise). The resolvers above are neutral-aware themselves, so
  their call sites are not listed (their handling is tested). The
  presentation layer is outside the audit (the UI bead draws the Spider);
  its kind reads go through `presentedUnitFactionV7`, which presents the
  Spider with the base art of its role until then.
- **The attack.** The `ATTACK` exchange after its validation is one
  function shared by the command and the neutral turn, with the neutral
  owner as the actor (no technology, no exploration, no advance, no
  settlement or achievements, no command index of its own). Kills by the
  Spider are credited to nobody (Plunder and the bounty skip a neutral
  credited owner).
- **`provokedBy` is derived from the events.** After every accepted
  command, the damage events (`COMBAT_RESOLVED` target and splash entries,
  `WAIL_RESOLVED`, `UNIT_BOMBED`, `UNIT_SURFACED`) name the units that hurt
  a Spider; those still on the board join its list. In an `END_TURN` with
  a neutral turn only the events after `NEUTRAL_TURN_ENDED` count (an
  eruption at the next seat's Start Turn provokes; a retaliation in the
  Spider's own attack does not). Every accepted state drops the entries of
  dead Spiders and the provokers no longer on the board.
- **Wail credit.** A Wail credits no kill (an Undead seat never has
  Plunder); a Spider the Wail kills is credited to the Banshee's owner for
  the bounty only.
- **Event position.** The blockade and sea-network events of an `END_TURN`
  (one of which a Spider's kill may cause) come at the end of the command,
  as before, not before `NEUTRAL_TURN_ENDED` (section 10.3's blockade list
  already covers them).
- **A Mountain lair** is reached from a capital (section 4.3 rule 6) when a
  tile next to it is reached over land without Mountains.
- **`monsterRetaliates`** is present exactly when the target is a visible
  Monster (an optional field of the public preview, so the preview of
  every other attack keeps the canonical preview's shape); it is true when
  neither side dies and the attacker stands in the Monster's reach.
- **`queryThreatenedTilesV7`** of a Monster unit is its provoke tiles; the
  per-unit query has no list of every Monster to add to.
- **`previewMonsterV7`'s area** ignores occupancy (the tiles of its area it
  may ever stand on); its reach counts an unexplored tile of its area as a
  possible step.
- **Headless.** The metrics gain `monsters` (`placed`, `damageDealt`,
  `kills`, `bountyCoins`, `slainRound`); the Spider's damage, kills, and
  death count for no role or faction.
- **Measured distribution** (seeds 0–31, every map type, size, and AI
  count; `npm run validate:ruleset7-curiosity-maps`, the independent
  checker now covering the Monster's lair rules): 188 Monsters, 463
  Fountains, 444 Shrines, and 765 Wrecks on the 1920 boards. Per 96 boards
  of a type at widths 16, 20, and 25: Dry Land 9, 9, 12; Pangea 16, 35, 29;
  Lakes 13, 29, 36; Continents and Archipelago none (5 from every center on
  a shared or neutral landmass, with no cut tile in the area, leaves no
  lair there). The per-board counts of section 4.2 are unchanged.
- **Fuzz.** The contract test plays Normal rounds with a Spider next to
  units of all seven factions in both modes, and headless matches with the
  option on at 16 x 16. A worker fuzz of 40 headless Normal matches that
  drew a Spider (20 Rival at 20 x 20 to 60 rounds, 20 Cooperative at
  16 x 16 to 50 rounds; Dry Land, Pangea, and Lakes; one to three
  opponents of all seven factions) found no error or stall: 168 Spider
  attacks, 97 kills by it, and 10 Spiders slain (100 bounty Coins).
  The Normal AI ignores curiosities (bead 4), so its units often walk next
  to the Spider and are attacked.

## 19. Implementation notes (`pulp_wars-737.6`)

The UI of section 12.1 is live; the screen-level description is the
[map curiosities overlay](../ui/SCREEN_FLOW.md#current-ruleset-7-map-curiosities-overlay)
of the screen flow. Where this spec was silent, or the user's standing rule
"no coordinates, minimal text" (`pulp_wars-b5f.8`) shortened it, the
implementation rules as follows:

- **"Neutral", not "Owned by nobody".** The Spider's dock carries the chip
  "Neutral" (and "Provoked" while a visible unit provokes it); its
  regeneration, bounty and target are lines of its "?" dialog. It shows no
  Sight, no owner, no faction badge and no command.
- **The provoke warning is a marker.** A Move target next to a visible
  Spider carries the provoked marker; the sentence of section 12.1 is the
  tile's cursor description, not a label box on every tile.
- **The banner.** "The wilds stir" is the log line of a neutral turn in
  which the viewer saw the Spider move or attack; it is a toast only when
  the Spider attacked the viewer's unit. A wander the viewer cannot see
  says nothing.
- **Draw order.** The web is under everything on its cell. The Fountain,
  the Shrine and the Wreck are drawn like a Treasure chest: over the Forest
  body of their own cell, under the unit on it. The Wreck is cut at a
  waterline (master row 58) with two ripple marks.
- **Art in the live look only.** The rasters are registered in the live
  direction registry. LEGACY and the Classic look draw the code markers of
  section 12.2 (also in the dock and as legend glyphs).
- **Shadow.** The Spider's 88 x 72 canvas is a giant's: its shadow takes
  the giant bounds from its measured base band
  (`unit-shadow-measurements-v7.generated.ts`).
- **Gallery.** A third tab, "Curiosities", with the Spider and the four
  tile overlays (no faction column: they belong to nobody).
- **Neutral when absent.** The board plan of a view without a curiosity or
  a Monster is exactly the plan before this bead (a test compares them),
  and the option on a board that drew none plans the same entries as the
  option off. Help shows its Curiosities section whenever the option is on.
- **Presentation readers.** The presentation layer is outside the
  owner-reader audit of section 10.5; a DOM test selects the Spider,
  previews an attack on it and plans its neutral turn in matches of all
  seven factions.

## 20. Implementation notes (`pulp_wars-737.4`)

The Normal AI of section 11 landed with no identity change (the policy is
not part of the ruleset identity; a match without a curiosity keeps its
hashes). The policy and its measurements are in
[Normal AI: map curiosities](../architecture/NORMAL_AI.md#map-curiosities-pulp_wars-7374).
Where section 11 was silent or did not fit the code, the implementation
rules as follows:

- **The combined kill counts Moves.** Section 11 (a) speaks of "this
  turn's offered attacks". A melee unit has no offered attack until it
  stands next to the Spider, so the kill plan also counts the own units that
  can move in and attack this turn (the existing hunt plan). A plan exists
  only when the projected hits take all its HP; each hunter that moves is
  held to the tile the plan counted for it, a hunter the retaliation would
  kill is left out, and a ranged hunter never ends next to the Spider.
- **A routine Move** is every `MOVE` and `DISEMBARK` except a hunter's Move
  in such a kill. A treasure chest on a provoke tile is left alone.
- **"With no attack"** (the step away) and **"no better target"** (rule (b))
  both mean: the unit has no offered attack on a unit that is not a Monster.
- **A sole city defender** is an own land unit on the center of one of its
  owner's cities with no other land unit of that owner within 2 of it.
- **"The last capturer of a planned capture"** is read as: a capturer
  within 2 of a center it can take (a hostile city or an unowned village)
  takes no Shrine errand.
- **Fountain safety** ("no visible enemy can reach this turn") is the
  policy's ordinary danger estimate for a unit standing on the Fountain
  being zero. A hurt unit on such a Fountain makes no Move until it has full
  HP.
- **The campaign has no retreat logic by HP,** so "the Fountain counts as
  recovery" is implemented as priorities: the walk to the Fountain outranks
  `RECOVER` and the wounded Windmill staging and is not held back by a
  campaign wave that waits at home.
- **Other damage** (splash, Wail, Kaboom, a Bomb Run, an Eruption) is not
  filtered: the policy does not aim these at the Spider, and a hit on it
  this way is incidental. Raise Dead is not filtered either (a Skeleton may
  rise next to the Spider; the ordinary "doomed Skeleton" rule counts the
  Spider's hit).
- **Cooperative matches.** The policy's own hostility test does not count
  the neutral owner as hostile for an AI seat in a Cooperative match; the
  curiosity rules read the view's `monsters` list instead, so they are the
  same in both modes.
- **Measured** (26 head-to-head games on 13 two-seat 16 x 16 boards that
  drew a curiosity, both seat orders): the new policy lost no unit to the
  Spider (the old one 6) and slew 4 Spiders (the old one 2); 14 wins to 11
  with one undecided, most boards going to the same seat in both orders.
  No Wreck was salvaged and no Fountain used by either policy in these
  short games; the coarse check of bead 7 should measure the errands on
  larger boards and may widen their bounds (4 steps; half HP within two
  turns).

## 21. Coarse check and fold (`pulp_wars-737.7`)

Bead 7 ran small, at the user's direction (no extensive balance testing at
this stage), with no identity change and no tuning:

- **The check** is the
  [curiosities check](../validation/RULESET_7_CURIOSITIES_CHECK.md): 40
  headless Normal matches (ten boards of 16 x 16 and 20 x 20 on Pangea,
  Lakes, and Continents, both seat orders, the option on and off on the
  same seeds) and the placement validator. No error or stall; 19 of 20
  pairs have the same winner; half of the pairs play command for command
  the same; the Spider fought in 2 of its 8 matches (2 units killed) and
  was slain once; 2 Fountain heals, 2 Shrine claims, and no Wreck salvaged
  in 10 matches.
- **Acceptance criterion 7** (section 14) is not decided at that size, and
  its "slain in a majority" predates the Normal AI's avoidance of the
  Spider (section 20); the check records this instead of tuning inside the
  bounds of section 15.
- **Rarity** (open question 3): the measured counts are at or below the
  table of section 4.2 and are kept. The check proposes, as follow-ups
  only, a lone Wreck placed half the time (water maps always have a
  curiosity from 16 x 16 up, nearly always a Wreck) and a wider Wreck
  errand for the Normal AI.
- **The fold:** current rules sections 2.7, 3, 11, 13.1, 15, 16, 24, and
  25 (as numbered since `7r38`), and the gates of the
  [release validation](../validation/RULESET_7_RELEASE.md).

## 22. Round 2: source and scope

**Status:** spec (`pulp_wars-737.12`); the engine is implemented
(`pulp_wars-737.14`, [section 39](#39-implementation-notes-pulp_wars-73714)),
the Normal AI and the UI are not yet. Sections 22 to 38 and [Appendix B](#appendix-b-round-2-draft-critique-and-changes) are the
live design of round 2; they overlay
[Ruleset 7: current rules](RULESET_7_CURRENT.md) at `pulp-wars-poc-7r59`,
where the round-1 curiosities are folded in
[section 2.7](RULESET_7_CURRENT.md#27-map-curiosities). Where this part
names a round-1 rule (sections 3 to 9), it means that rule as the code
implements it today (sections 17 to 21 and current rules section 2.7), not
the round-1 values of sections 4 to 9 where those differ. Every rule this
part does not mention stays in force. The implementation beads append
their notes after section 38.

**Source.** The user, 2026-10-08 (`pulp_wars-737.12`, superseding the
2026-10-06 requests `pulp_wars-737.10` and `pulp_wars-737.11`):

> (1) Downed spaceship, only on maps without Martians: a downed flying
> saucer with, next to it, 1 Grunt, or 2 Grunts, or 2 Grunts and a Shield
> Projector, or a Grunt and a Ray Gunner; they walk around randomly within
> 2 tiles of the saucer and attack anyone who gets too close. (2) Only on
> maps without the Undead: a graveyard and 2 Zombies wandering around it;
> they attack anyone on sight. (3) On big maps: 2 dimensional gates on
> opposite sides of the map; a unit that steps on one emerges from the
> other; a unit standing on the other gate gets displaced. (4) Think of 2
> more little easter-egg curiosities and implement them.

The root's proposal for (4) was **Bigfoot** (a shy neutral cryptid on big
maps with Forest that never attacks, wanders widely through Forest, flees
fast from any unit that comes near, and pays a large Coin bounty) and the
**Wishing Well** (a unit standing on it may toss a Coin once for a seeded
random small outcome: a few Coins back, a full heal, a revealed area, or
just a splash).

**Fixed by the user:** the four camp compositions; the saucer only on maps
without a Martian seat and the graveyard only on maps without an Undead
seat; the guards wander within 2 tiles of their saucer or graveyard; the
saucer guards attack anyone who gets too close and the Zombies anyone on
sight; two gates on opposite sides of big maps, a unit stepping on one
emerging from the other, and a unit on the exit displaced. Everything else
is a ruling of this part; the critique of
[Appendix B](#appendix-b-round-2-draft-critique-and-changes) kept both
easter eggs and narrowed each (B.2, C17 and C18).

## 23. Round 2: summary and pillars

| Curiosity             | Where                                                       | One sentence (the Help text)                                                                                                                                 |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Downed Saucer**     | Grass or Forest, boards 16 and up, no Martian seat          | Stranded Martians guard a crashed saucer and, after every round, attack the weakest unit that came within 2 of the saucer, stood next to them, or hurt them. |
| **Graveyard**         | Grass, boards 16 and up, no Undead seat                     | Two Zombies shamble around a graveyard and, after every round, attack the weakest unit they can reach.                                                       |
| **Dimensional Gates** | Grass or Forest, a pair on opposite sides, boards 20 and up | A unit that steps onto a gate comes out of the other one, shoving aside any unit standing there.                                                             |
| **Bigfoot**           | Forest, boards 20 and up                                    | A shy Bigfoot roams its forest, never fights, flees from any unit that comes within 3, and pays 12 Coins to whoever brings it down.                          |
| **Wishing Well**      | Grass                                                       | Once per match, each player may have a unit standing on the Well toss a Coin into it for a small surprise.                                                   |

The round-1 pillars hold, with one addition:

1. **Colour first, tactics second.** A camp is a hazard and a small purse,
   the gates a shortcut, Bigfoot a chase, the Well a coin flip; none is a
   reason a match is won.
2. **Very rare.** The per-board counts of section 4.2 are unchanged: the
   five new kinds share the same one or two draws with the four old ones
   (section 24.1), so no board gets more curiosities than before, and each
   round-1 kind becomes rarer.
3. **Every rule is visible and fits in one sentence** (the table above).
   Everything a curiosity does is public on an explored tile; a gate's exit
   is explored with its entrance (section 28.5).
4. **Simplicity.** One new command (`TOSS_COIN`, the Well's choice), no new
   terrain, no new status. Every neutral unit is a unit of the Spider's
   neutral owner, acts in the Spider's neutral turn, and has the Spider's
   immunities.
5. **Neutral when absent.** The option off is byte for byte the option off
   of `7r59`; a match whose board drew none of the new kinds has no
   `TOSS_COIN`, no gate stop, and no extra neutral unit.
6. **One danger per board** (new). A board has at most one hostile neutral
   group: the Giant Spider, a Downed Saucer camp, or a Graveyard
   (section 24.1). Bigfoot never attacks and does not count.

The option (section 3) is unchanged: `curiosities: false` switches every
kind of both rounds off. The setup hint becomes "Rare sights on the map:
monsters, camps, gates, a well, and more."

## 24. Generation (round 2)

### 24.1 Kinds, order, weights, and eligibility

Placement keeps section 4.1 (its own stream, no board rejected, run after
the chests and the Rifts) and the count table of section 4.2. The kinds, in
the frozen draw order:

| #   | Kind            | Weight | Board            | Seats (`setup.factions`) | Terrain of its tile               |
| --- | --------------- | -----: | ---------------- | ------------------------ | --------------------------------- |
| 1   | `MONSTER`       |      3 | width 16 or more | any                      | Grass, Forest, or Mountain (lair) |
| 2   | `FOUNTAIN`      |      3 | any              | any                      | Grass                             |
| 3   | `SHRINE`        |      2 | any              | any                      | Grass or Forest                   |
| 4   | `WRECK`         |      2 | not Dry Land     | any                      | Shallow or Deep Water             |
| 5   | `DOWNED_SAUCER` |      2 | width 16 or more | no `MARTIAN` entry       | Grass or Forest (the camp centre) |
| 6   | `GRAVEYARD`     |      2 | width 16 or more | no `UNDEAD` entry        | Grass (the camp centre)           |
| 7   | `GATES`         |      2 | width 20 or more | any                      | Grass or Forest (each gate)       |
| 8   | `BIGFOOT`       |      1 | width 20 or more | any                      | Forest (its home)                 |
| 9   | `WISHING_WELL`  |      1 | any              | any                      | Grass                             |

Each curiosity in turn, the **eligible kinds** are the kinds that are not
yet placed, allowed by the board and the seats in the table, **not
excluded by the one-danger rule** (once `MONSTER`, `DOWNED_SAUCER`, or
`GRAVEYARD` is placed, the other two of these three are not eligible), and
with at least one legal site (for `GATES`, one legal pair). With none,
placement stops. The faction test reads `setup.factions` (every seat, AI
and human; a mind-controlled unit later in the match changes nothing).

**The stream's draws, in order** (all `nextBounded` on the curiosity
stream of section 4.1):

1. the count draw of section 4.2 (none on widths 16 and 25);
2. for each curiosity: the kind draw over the summed weights of the
   eligible kinds in table order; then the site draw over the kind's legal
   sites in `(y, x)` order (for `GATES`, over the legal pairs, section
   24.4); then
   - `DOWNED_SAUCER`: the composition draw `nextBounded(4)` (section 26),
     then one guard-tile draw per guard in composition order;
   - `GRAVEYARD`: one guard-tile draw per Zombie (two);
   - every other kind: nothing more.

A **guard-tile draw** is uniform over the centre's eight neighbours, in
`(y, x)` order, that a guard may stand on (section 25.3) and that no guard
placed before it occupies.

**Entities.** Neutral units (the Spider, the guards, Bigfoot) are created
after every other initial entity, in the order their curiosities were
placed, a camp's guards in composition order. Each starts at its maximum HP
with a fresh activation and an empty `provokedBy`.

**What the option on changes.** Since the kind draw now spans nine kinds,
a board with the option on may draw different curiosities from the same
seed at `7r59`; the option off is untouched (section 32.1).

### 24.2 Where: the rules every new kind shares

Every tile a new kind occupies (a camp centre, each gate, Bigfoot's home,
the Well) obeys rules 1, 2, 3, 5, and 6 of section 4.3 as implemented
(off the edge ring; no site, chest, resource, improvement, or Rift; 3 or
more from every settlement centre; 5 or more from every curiosity already
placed, counting every tile of a placed kind: a lair, a camp centre, both
gates, Bigfoot's home; a shared or neutral landmass, reached over land
without Mountains from a capital on a shared one). Rule 4 (5 or more from
every capital, at most 4 between the farthest and nearest capital) holds
for every new kind except the gates, which replace its second half with
the pair rule of section 24.4.

### 24.3 Where: each new kind

| Kind            | More                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DOWNED_SAUCER` | Every lair rule of the Spider as implemented (current rules section 2.7): every tile within 2 on the board; 5 or more from every capital and 4 or more from every village centre; at least 12 of the 24 tiles around it Grass, Forest, or Mountain; no cut tile of the land graph, with or without Mountains, within 2 of it. And **at least 3** of its eight neighbours are tiles a guard may stand on at generation (section 25.3). |
| `GRAVEYARD`     | The same, with **at least 2** such neighbours.                                                                                                                                                                                                                                                                                                                                                                                        |
| `GATES`         | Section 24.4.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `BIGFOOT`       | Its **habitat** at placement (section 29.2) has **at least 12** tiles, home included, and no Forest tile within 4 of home that is 3 or more from every settlement centre is a cut tile of the land graph, with or without Mountains.                                                                                                                                                                                                  |
| `WISHING_WELL`  | Nothing more.                                                                                                                                                                                                                                                                                                                                                                                                                         |

### 24.4 The gate pair

A **gate tile** obeys section 24.2 (rule 4's first half only: 5 or more
from every capital), stands on Grass or Forest, and is not a cut tile of
the land graph, with or without Mountains (Rifts excluded), so a gate never
closes a corridor (entering a gate ends a Move, section 28.2).

A **legal pair** is two gate tiles `A` and `B`, `A` before `B` in `(y, x)`
order, with:

- **opposite sides:** Chebyshev distance from `A` to `B` at least
  `GATE_SEPARATION_V7(width) = ceil(2 × width / 3)`: **14** on 20 x 20 and
  **17** on 25 x 25;
- **fair to every start:** for each capital `c`, let `g(c)` be the
  Chebyshev distance from `c` to the nearer of `A` and `B`; the largest
  `g(c)` minus the smallest is **at most 4**.

The site draw is uniform over the legal pairs listed in lexicographic order
of `(A, B)`, each by `(y, x)`. Both gates count as placed curiosities for
rule 5 (the next curiosity keeps 5 from each).

### 24.5 Distribution

The engine bead extends the distribution validator
(`npm run validate:ruleset7-curiosity-maps`, seeds 0–31, every map type,
size, and AI count, with faction mixes that include and exclude the Martian
and Undead seats) and records the count of every kind per map type and
size. Hard checks: no `DOWNED_SAUCER` with a Martian seat, no `GRAVEYARD`
with an Undead seat, no `GATES` or `BIGFOOT` below width 20, never two of
the three dangers on one board, and every placed curiosity accepted by the
independent checker of sections 24.2 to 24.4. Expected, not checked: on
Continents and Archipelago the camps are as rare as the Spider (none in the
round-1 measure) and the gates mostly fail rule 6 there too.

## 25. Neutral camps: the shared rules

A **camp** is a camp centre (a `DOWNED_SAUCER` or `GRAVEYARD` tile marker
in `GameStateV7.curiosities`) and its **guards**: neutral units with a
`monsters` entry whose `breed` is a guard breed and whose `home` is the
centre. Everything the round-1 rules say of the Spider's neutral owner
(section 8.1: owned by `NEUTRAL_OWNER_ID_V7`, hostile to every player in
both modes, allied to nobody, no home city, never commanded), its
immunities (section 8.6: every damage applies, no status sticks, nothing
moves it, no healing), its death and kill credit (section 8.7), its fog
(section 8.8), and its determinism (section 8.9) holds for every guard and
for Bigfoot, with the differences this part states.

### 25.1 The camp's area

The camp's **area** is every tile within Chebyshev **2** of the centre,
except the centre (the user's "within 2 tiles"). The centre itself is an
ordinary tile for every player's unit (enter, stand, pass) and is never
stood on by a guard.

### 25.2 Guard stats (the neutral registration)

A guard has its faction role's stats with two changes: **its Shield maximum
is added to its HP** (a neutral unit has no Shield: the `shields` list
admits no entry in a match without a Martian seat, and nobody recharges a
neutral Shield), and **every guard may attack after its step** (the
Shield Projector and the Zombie may not as faction units).

| Breed              | Label            | Mechanical role | HP                 | Attack (`attack2`)        | Defense (`defense2`) | Move | Range | Abilities            | Bounty |
| ------------------ | ---------------- | --------------- | ------------------ | ------------------------- | -------------------- | ---: | ----- | -------------------- | -----: |
| `GRUNT`            | Grunt            | `FIGHTER`       | 10 (8 + Shield 2)  | 2 (4)                     | 1.5 (3)              |    1 | 1–2   | `ATTACK`             |      3 |
| `RAY_GUNNER`       | Ray Gunner       | `MARKSMAN`      | 10 (8 + Shield 2)  | 3 (6), half power 1.5 (3) | 1 (2)                |    1 | 1–2   | `ATTACK`, `HEAT_RAY` |      4 |
| `SHIELD_PROJECTOR` | Shield Projector | `GUARD`         | 15 (12 + Shield 3) | 1.5 (3)                   | 2.5 (5)              |    1 | 1     | `ATTACK`             |      4 |
| `ZOMBIE`           | Zombie           | `GUARD`         | 18                 | 2 (4)                     | 2 (4)                |    1 | 1     | `ATTACK`             |      5 |

- **No Sight, no cost, no technology, no capture, no Force Field** (the
  neutral owner has no Force Fields), **no Bite, no Infect** (the Bitten
  and Plague lists are empty without an Undead seat, and a guard's kill
  raising more guards would be a respawning neutral, which round 1
  rejected: section A.4), no advance after a kill, no Push, and **no
  regeneration** (only the Spider regenerates).
- **The Ray Gunner's ray** follows current rules section 20.4: full power
  when it has not stepped in this neutral turn, half power after a step;
  its registration has the `heatSink` mechanic, so it **never Cools** and
  adds no `cooling` entry.
- Constants: `CAMP_RADIUS_V7` 2, `GRUNT_BOUNTY_V7` 3,
  `RAY_GUNNER_BOUNTY_V7` 4, `SHIELD_PROJECTOR_BOUNTY_V7` 4,
  `ZOMBIE_BOUNTY_V7` 5.

Worked examples (engine formula of current rules section 13.2, full HP,
open Grass; "dealt / taken back"):

| A guard attacks                                 | Result    | A unit attacks a guard      | Result                      |
| ----------------------------------------------- | --------- | --------------------------- | --------------------------- |
| Grunt, Fighter (12) next to it                  | 5 / 5     | Fighter, Grunt              | 5 / 3                       |
| Grunt, Fighter from 2                           | 5 / none  | Fighter, Shield Projector   | 4 / 6                       |
| Grunt, Knight (13) from 2                       | 6 / none  | Fighter, Zombie             | 5 / 5                       |
| Ray Gunner (full), Fighter from 2               | 8 / none  | Knight, Grunt or Ray Gunner | 10, dead                    |
| Ray Gunner (full), Knight from 2                | 10 / none | Knight, Zombie              | 12 / 3                      |
| Ray Gunner (half, after a step), Fighter from 2 | 3 / none  | Marksman from 2, Grunt      | 5 / 3 (the Grunt reaches 2) |
| Shield Projector, Fighter                       | 3 / 5     | Marksman from 2, Zombie     | 5 / none                    |
| Zombie, Fighter                                 | 5 / 5     | Catapult from 3, Grunt      | 9 / none                    |

So a lone Fighter that wanders in loses about 5 HP a round; a Ray Gunner
standing still hits a scout hard from 2; one Knight kills a Grunt or Ray
Gunner outright; the two Zombies (36 HP in all, no regeneration) want three
or four good hits.

### 25.3 Where a guard may stand, and how it moves

A guard may stand on a tile of its camp's area (section 25.1) that is
Grass, Forest, or Mountain (never a Rift or water), 3 or more from every
settlement centre, with no unit, mound, or treasure chest: the Spider's
standable rule (`monsterStandableV7`) with the camp centre as `home`, minus
the centre. It moves **one step** to a Chebyshev neighbour it may stand on,
at most once per neutral turn and only then; it exerts no zone of control
and blocks its own tile like any other owner's unit.

Because a guard always stands 3 or more from every settlement centre and
reaches at most 2 from where it stands, **it never attacks a unit on a
settlement centre**; a unit on a centre's first ring can be attacked only
by a Grunt or Ray Gunner that the unit itself hurt (section 25.4).

### 25.4 Provocation and the attack

The **provokers of a camp** at its neutral turn are the units that are on
the board, not neutral, and:

- **Downed Saucer** ("anyone who gets too close"): stand within **2** of
  the saucer (the **perimeter**, the area plus the centre), or stand next
  to (Chebyshev 1) a guard of the camp, in any form, or are listed in the
  `provokedBy` of any guard of the camp (they hurt one of them since the
  previous neutral turn; the round-1 recording of section 18 applies to
  each guard).
- **Graveyard** ("anyone on sight"): every such unit. The Zombies' reach
  (2 from the graveyard to stand, 1 to strike) bounds it: in practice
  every unit within 3 of the graveyard.

Each guard of the camp acts in unit-ID order within the neutral turn
(section 25.5), reading the board as the earlier guards left it:

1. Its **candidates** are the camp's provokers it can attack this turn:
   at a distance within its range now, or from a tile it may step to.
2. It picks the one with the **lowest HP**, ties broken by the **lowest
   unit ID** (a Shield does not count, as for the Spider).
3. If the target is within its range now, it attacks **without stepping**.
   Otherwise it steps to the **first** tile in `(y, x)` order among the
   tiles it may step to from which the target is within its range, then
   attacks.
4. The attack is the ordinary `ATTACK` exchange the Spider uses (damage
   both ways, retaliation when the defender reaches the guard, kill
   credit, deaths, Graves, risings, death-blast chains, Plunder, the
   bounty, the live economy). It never advances and never pushes.

With **no candidate** it **wanders**: the Spider's stateless draw of
section 8.4 ("stay" followed by its step tiles in `(y, x)` order, one
`nextBounded` on `randomState(seedFromText("pulp-wars-monster:" + seed +
":" + round + ":" + unitId))`).

### 25.5 The neutral turn, generalized

The neutral turn of section 8.5 and current rules section 2.7 now runs when
`monsters` is non-empty (any breed) and acts for **every neutral unit in
unit-ID order**: the Spider attacks or wanders (unchanged), a guard attacks
or wanders (section 25.4), Bigfoot flees or wanders (section 29.3). Then
the Spider alone regenerates, and every `provokedBy` is cleared. The events
are those of the Spider's turn (`NEUTRAL_TURN_STARTED`, `UNIT_MOVED`,
`COMBAT_RESOLVED`, the death events, `MONSTER_REGENERATED`,
`NEUTRAL_TURN_ENDED`).

### 25.6 Death, bounty, and the cleared camp

- A guard's death is credited by the ordinary table (section 8.7 as
  implemented); the credited player gains the guard's bounty (section
  25.2) through the Spider's event `MONSTER_BOUNTY_AWARDED { playerId,
unitId, coins }`. Ordinary kill credit (Promotion, growth, Slayer,
  Plunder) applies; a guard's own kills are credited to nobody.
- **No respawn.** A dead guard is gone for the match and its `monsters`
  entry is removed.
- **The cleared camp** (no guard left) stays on the board as **scenery**:
  the centre's marker never changes and is never claimed, removed, or
  looted; its tile stays ordinary. A camp's whole purse is its bounties:
  1 Grunt 3 Coins, 2 Grunts 6, 2 Grunts and a Shield Projector 10, a Grunt
  and a Ray Gunner 7, the Graveyard 10.

## 26. The Downed Saucer

**One sentence:** stranded Martians guard a crashed saucer and, after every
round, attack the weakest unit that came within 2 of the saucer, stood next
to them, or hurt them.

- **Placement:** section 24 (kind 5): only when no entry of
  `setup.factions` is `MARTIAN`, width 16 or more, Grass or Forest.
- **Composition**, by the composition draw `nextBounded(4)`, each equally
  likely (the user's four, in the user's order):

  | Draw | Guards, in composition order   | HP in all | Bounty in all |
  | ---: | ------------------------------ | --------: | ------------: |
  |    0 | Grunt                          |        10 |             3 |
  |    1 | Grunt, Grunt                   |        20 |             6 |
  |    2 | Grunt, Grunt, Shield Projector |        35 |            10 |
  |    3 | Grunt, Ray Gunner              |        20 |             7 |

- Each guard starts on a neighbour of the saucer (a guard-tile draw,
  section 24.1); then the shared camp rules of section 25 apply with the
  saucer's provocation (the perimeter, adjacency, or a hurt).
- The saucer is scenery: it is not a Martian unit, building, or Saucer,
  nothing salvages it, and a Martian seat never meets it (the kind is
  never placed with one).

## 27. The Graveyard

**One sentence:** two Zombies shamble around a graveyard and, after every
round, attack the weakest unit they can reach.

- **Placement:** section 24 (kind 6): only when no entry of
  `setup.factions` is `UNDEAD`, width 16 or more, Grass.
- **Two Zombies** start on two neighbours of the graveyard (two guard-tile
  draws); then the shared camp rules of section 25 apply with the
  graveyard's provocation (every unit they can reach).
- **Not a Grave.** The graveyard is a tile marker of `curiosities`, not an
  entry of `graves`; no Undead rule reads it (and the match has no Undead
  seat). A Zombie's death leaves no Grave for the same reason.

## 28. Dimensional Gates

**One sentence:** a unit that steps onto a gate comes out of the other one,
shoving aside any unit standing there.

### 28.1 The pair

Two `GATE` tile markers, each naming its `partner` (section 24.4 places
them). Gate tiles are ordinary land otherwise: never in territory (3 or
more from every centre), never claimed or removed, a Road may cross one,
and a Grave may lie on one. A neutral unit never stands on a gate (spacing
and Bigfoot's habitat keep them away).

### 28.2 Stepping on

- **A gate stops every Move that enters it,** for every unit (flyers,
  walkers, Rushed units, a Raider's Escape included): a `MOVE` path may end
  on a gate but never continue past one (`MOVEMENT_ILLEGAL` with a new
  reason `GATE_STOPS_MOVE`), the way a terrain stop works
  (`terrainStopsMoveV7`). A unit can therefore never pass over a gate
  without traversing it.
- **Traversal.** A unit **traverses** when its own `MOVE` ends on a gate
  with a non-empty path (the step onto the gate is its own), or its
  `DISEMBARK` lands on a gate. First the command's ordinary end-of-Move
  steps run on the entry gate (for example, Crumbs there are eaten); then
  the unit is placed on the partner gate, after displacing any unit there
  (section 28.3).
- **After traversal** the Move is spent (`activation.moved` true and
  `movedPathLength` the path's length, as before the traversal); the unit
  may still use a primary action this turn if it could after that Move
  (`unitMayActAfterMoveV7`), and an embarked unit that landed is exhausted
  as after any `DISEMBARK`. Arriving triggers nothing else: no zone of
  control, capture, chest, Crumbs, claim, or Shrine at the exit.
- **Not a traversal:** every placement or forced move onto a gate (Push,
  the Charge! push and follow, Knockback, the Tractor Beam, an advance, an
  Overrun, Beam Down, a rising, a hatch, a treasure or reward unit, a
  displacement). Such a unit just stands on the gate; it traverses only by
  later stepping off and back on. A gate is never a tunnel or rider
  destination (the Dwarf tunnel-tile rule gains "not a gate"), so a mound
  never lies on a gate; a tunnel may pass under one. Afloat units never
  reach a gate (land).

### 28.3 Displacing the occupant

When a unit traverses and a unit (of any owner, the mover's own included)
stands on the exit gate, that occupant is **displaced** first: it is moved
to the first tile, in the clockwise order **N, NE, E, SE, S, SW, W, NW**
around the exit gate, that is on the board, may hold the occupant under
`canEnterTerrainV7` (its form, movement mode, and owner's technologies),
holds no unit, mound, treasure chest, or gate, and is not a settlement
centre.

- The displaced unit keeps its activation, HP, Shield, and statuses; the
  displacement is not a Move and triggers nothing (no capture, chest,
  claim, Crumbs, or provocation of its own; standing next to a Spider or
  inside a perimeter afterwards provokes as usual at the next neutral
  turn). It deals no damage.
- **Blocked.** With no such tile, nothing is displaced and **the traversal
  does not happen**: the mover stays on the entry gate with its Move spent
  (`GATE_BLOCKED`).

### 28.4 Events

`GATE_DISPLACED { unitId, from, to }` (when an occupant moves), then
`GATE_TRAVERSED { playerId, unitId, from, to }`, or instead
`GATE_BLOCKED { playerId, unitId, at }`; all after the command's own
`UNIT_MOVED` or `UNIT_DISEMBARKED` and its reveals, then one
`TILES_REVEALED` for the traversed unit's sight at the exit. Projection:
to every viewer that has explored the gates (section 28.5) or sees a unit
involved, by the ordinary unit-visibility rule.

### 28.5 Fog: a gate shows its partner

Whenever a gate tile becomes explored for a player, by any reveal, its
partner tile becomes explored for that player **in the same reveal**
(`TILES_REVEALED` lists both). Since a unit on an explored tile is visible,
a player who knows one gate always sees who stands on the other, and every
displacement is predictable from the public view.

## 29. Bigfoot

**One sentence:** a shy Bigfoot roams its forest, never fights, flees from
any unit that comes within 3, and pays 12 Coins to whoever brings it down.

### 29.1 Stats

| Breed     | Label   | Mechanical role |  HP | Attack | Defense (`defense2`) | Flee | Range | Abilities | Regeneration | Bounty |
| --------- | ------- | --------------- | --: | -----: | -------------------- | ---: | ----: | --------- | -----------: | -----: |
| `BIGFOOT` | Bigfoot | `RAIDER`        |  15 |      0 | 2 (4)                |    3 |     0 | none      |            0 |     12 |

- **It never attacks and never retaliates** (range 0: every attack on it
  is unanswered, `noRetaliationReason` `OUT_OF_RANGE`). It is attacked like
  any hostile unit and gets the Forest cover (1.5) of a neutral defender.
- Constants `BIGFOOT_HP_V7` 15, `BIGFOOT_DEFENSE2_V7` 4,
  `BIGFOOT_HABITAT_RADIUS_V7` 4, `BIGFOOT_ALERT_RADIUS_V7` 3,
  `BIGFOOT_FLEE_STEPS_V7` 3, `BIGFOOT_BOUNTY_V7` 12.
- Worked examples (full HP; open / Forest): a Fighter deals 5 / 4, a
  Knight 12 / 10, a Catapult 8 / 7, a Juggernaut 12 / 10. A Knight and a
  Fighter in one turn kill it in its Forest.

### 29.2 Habitat

Its **home** is its placement tile. Its **habitat** is every tile within
Chebyshev **4** of home that is **Forest**, 3 or more from every settlement
centre, and **3 or more from every other curiosity tile** on the board (a
lair, a camp centre, a gate, a Fountain, Shrine, Wreck, or Well), so it
never enters a Spider's or a camp's area and never stands on a gate.
Bigfoot may stand on a habitat tile with no unit, mound, or treasure chest.
Territory never reaches its habitat (3 from every centre), so its Forest is
never cleared; a Shrine or Wreck that leaves the board can only widen it.

### 29.3 Its turn: flee or wander

In the neutral turn (section 25.5):

- **Alert.** When any unit that is not neutral is on the board within
  Chebyshev **3** of it, Bigfoot **flees**: among the tiles it can reach in
  **0 to 3 steps**, each step to a Chebyshev neighbour it may stand on
  (section 29.2; it cannot pass any unit), it moves to the one with the
  **greatest Chebyshev distance to the nearest non-neutral unit on the
  board**; ties broken by fewer steps, then by `(y, x)` order. One
  `UNIT_MOVED` with the whole path (none when it stays).
- **Otherwise** it wanders like the Spider: one step or stay, by the
  stateless draw of section 8.4 over its standable neighbours.
- It is never provoked; its `provokedBy` is recorded like any neutral
  unit's and has no effect.

A Move-1 unit rarely reaches it; a Knight (Move 3, attacks after moving),
a Raider, a Catapult or Battleship in range, or several units closing a
Forest pocket do. That is the chase.

### 29.4 Death and bounty

As a guard (section 25.6), with `BIGFOOT_BOUNTY_V7` = **12** Coins through
`MONSTER_BOUNTY_AWARDED`. No respawn; it leaves a Grave in a match with an
Undead seat like any death.

## 30. The Wishing Well

**One sentence:** once per match, each player may have a unit standing on
the Well toss a Coin into it for a small surprise.

### 30.1 The command

`TOSS_COIN { kind, unitId }`, a **primary action**. Legality, in this
order (all rejections atomic):

| #   | Requirement                                                                                                                                      | Rejection                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                   | the ordinary unit errors                           |
| 2   | It is in land form on the `WISHING_WELL` tile.                                                                                                   | `TOSS_COIN_NOT_LEGAL { reason: "NOT_ON_WELL" }`    |
| 3   | It may use a primary action now (current rules section 12.2: not already acted, may act after its Move, not sluggish after a Move, not Crashed). | the ordinary activation errors                     |
| 4   | The actor is not in the Well's `tossedBy`.                                                                                                       | `TOSS_COIN_NOT_LEGAL { reason: "ALREADY_TOSSED" }` |
| 5   | The actor has at least 1 Coin.                                                                                                                   | `INSUFFICIENT_COINS { cost: 1 }`                   |

An Egg has no activation and never tosses; a neutral unit never commands.

### 30.2 The outcome

The actor pays `WELL_TOSS_COST_V7` = **1** Coin, joins the Well's
`tossedBy` (sorted), and the unit's primary action is spent. The outcome is
one `nextBounded(4)` on
`randomState(seedFromText("pulp-wars-well:" + seed + ":" + playerId))`: a
stateless draw keyed by the player, so it never touches the match PRNG and
does not depend on when, or with which unit, the player tosses.

| Draw | Outcome  | Effect                                                                                                                        |
| ---: | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
|    0 | `SPLASH` | Nothing (the Coin is gone).                                                                                                   |
|    1 | `COINS`  | The actor gains `WELL_COINS_V7` = **5** Coins (4 net).                                                                        |
|    2 | `HEAL`   | The unit heals to its maximum HP (HP only, like the Fountain: cures nothing, recharges no Shield; a construct heals nothing). |
|    3 | `VISION` | Every tile within Chebyshev `WELL_VISION_RADIUS_V7` = **5** of the Well becomes explored for the actor.                       |

Event `COIN_TOSSED { playerId, unitId, at, outcome, coinsGained, hpAfter }`
(`coinsGained` 5 or 0, `hpAfter` the unit's HP after), then
`TILES_REVEALED` for `VISION`. Projected in full to the actor and to every
viewer that sees the unit (the outcome is visible at the Well and its
amounts are rule constants).

### 30.3 The tile

The Well is Grass for the match, never claimed or removed; units enter and
stand on it normally and nothing happens on entering. It stays after every
player has tossed.

## 31. Interactions (round 2)

The round-1 table of section 9 applies to every neutral unit as to the
Spider. In addition:

| Rule or faction        | Ruling                                                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cities, capture, siege | No new curiosity is in territory; no neutral unit stands within 2 of a centre or attacks a unit on one (sections 25.3 and 29.2). Gates and the Well are never owned.                                                                                             |
| Movement               | A gate stops every Move that enters it (section 28.2) and is never a cut tile, so no route is closed. Camp centres and the Well are ordinary to enter.                                                                                                           |
| One danger per board   | Never a Spider and a camp, or two camps, on one board (section 24.1).                                                                                                                                                                                            |
| Round-1 curiosities    | Every curiosity keeps 5 from every other (rule 5), so a guard's reach (at most 4 from its centre) never covers a unit on a Fountain, Shrine, Wreck, gate, or Well; Bigfoot keeps 3 from every curiosity tile.                                                    |
| Human                  | A Knight that kills a guard advances onto its tile (inside the camp) and may Overrun; Field Defense never stands in a camp (never territory).                                                                                                                    |
| Undead                 | No Graveyard in an Undead match. Wail and Lich splash damage guards and record `provokedBy`; a guard or Bigfoot leaves a Grave like any death; an Undead seat's Zombie that kills a neutral unit raises nothing (immune to Infect).                              |
| Goblin                 | Gang Up, Kaboom, and death blasts work on neutral units; Plunder and the bounty both pay the credited Goblin seat.                                                                                                                                               |
| Dinosaur               | A neutral kill grows a dinosaur. Charge! damages a guard but never pushes it. Eggs are never on or next to a gate (Eggs lie within 1 of a centre).                                                                                                               |
| Martian                | No Downed Saucer in a Martian match. Mind Control and the Tractor Beam never take a neutral unit. A Saucer or Mothership that flies onto a gate stops and traverses; a Tractor Beam pull or Beam Down onto a gate does not traverse.                             |
| Ice Folk               | Frozen never applies to a neutral unit: Bolas, Frost Bolt, Cold Snap, the Cold Aura, Black Ice, Frostbite, and the shards skip it (Chill until `pulp_wars-w49.37`). A Glide onto a gate stops there; gates are land, so no slide reaches one.                    |
| Dwarf                  | A gate is never a tunnel or rider destination (a tunnel may pass under it). A Gyrocopter stops on a gate and traverses. Knockback never moves a neutral unit; Knockback onto a gate does not traverse. Constructs gain nothing from the Well's `HEAL`.           |
| Candy                  | Splat and every Candy status skip neutral units (the round-1 "no status sticks" rule). A neutral step is not a `MOVE`: it never eats Crumbs. A unit that traverses eats Crumbs on the entry gate only. A Rushed unit's extra point never carries it past a gate. |
| Naval                  | A boat or embarked unit within a saucer's perimeter or next to a guard provokes it, and a Graveyard Zombie attacks one it can reach from the shore. Afloat units never traverse or toss.                                                                         |
| Achievements           | Slayer counts every neutral kill like any kill; nothing else counts the new kinds.                                                                                                                                                                               |
| Showcase, missions     | Never any curiosity (section 17), whatever the field.                                                                                                                                                                                                            |

## 32. Engine impact (round 2)

### 32.1 Identity and compatibility

- **One identity bump** (bead `pulp_wars-737.14`): the next free
  `pulp-wars-poc-7rNN`, appending the previous identity to
  `PRIOR_RULESET_7_IDS` and moving the autosave key, as every bump does.
  Earlier identities are rejected, never migrated.
- Map revision unchanged (no tile changes). The `*_CURIOSITIES` generation
  rules place the round-2 kinds; no mode reproduces the round-1 placement
  with the option on (earlier identities are rejected anyway).
- **Off is unchanged:** with `curiosities: false`, generation and every
  pinned match equal those of the previous identity apart from the
  identity, for every seed, size, AI count, map type, and faction mix.

### 32.2 State

| Field                     | Shape                                                                                                                                                                                                                                   | Parsing rejects                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GameStateV7.curiosities` | A union sorted by `(y, x)`: `{ kind: "FOUNTAIN" \| "SHRINE" \| "WRECK" \| "DOWNED_SAUCER" \| "GRAVEYARD", at }`, `{ kind: "GATE", at, partner }`, `{ kind: "WISHING_WELL", at, tossedBy: PlayerId[] }` (`tossedBy` sorted, seats only). | What round 1 rejects; a `GATE` without exactly one other `GATE` naming it as `partner`, or more than one pair; a `DOWNED_SAUCER` with a Martian seat or a `GRAVEYARD` with an Undead seat; two camps, or a camp with a Spider; a `GATE` below width 20; a camp centre or gate on the wrong terrain; a `tossedBy` entry that is not a seat, duplicated, or unsorted.                                               |
| `GameStateV7.monsters`    | `{ unitId, breed, home, provokedBy }[]`, sorted by `unitId`; `breed` one of `GIANT_SPIDER`, `GRUNT`, `RAY_GUNNER`, `SHIELD_PROJECTOR`, `ZOMBIE`, `BIGFOOT`.                                                                             | What round 1 rejects, per breed: a unit whose role is not the breed's mechanical role, whose maximum HP is not the breed's, or that stands where its breed may not (the lair area, its camp's area, its habitat); a guard whose `home` is not a camp centre of a matching kind (Grunt, Ray Gunner, Shield Projector: a saucer; Zombie: a graveyard); a `BIGFOOT` below width 20; more than one Spider or Bigfoot. |

No other field. A state with `curiosities: false` serializes as before
apart from the identity.

### 32.3 The neutral registration by breed

The registration becomes a table keyed by `breed` (section 25.2, section
29.1, and the Spider's row), not by role: the Zombie and the Shield
Projector share the mechanical role `GUARD`. The kind resolvers
(`unitRoleRuleV7`, `unitRoleMechanicsV7`, `unitCapabilitiesV7`) read a
neutral unit's breed from its `monsters` entry; the roster they take gains
the `monsters` list, as it carries `mindControlled`. Every neutral
breed's capabilities are those of the empty technology list; the Ray
Gunner's mechanics carry `heatSink`. The owner-reader audit of sections
10.5 and 18 is extended: every new call site is classified, and the fuzz
of section 18 places a camp of every composition, a Graveyard, and Bigfoot
next to units of all eight factions.

### 32.4 Commands and events

- **New command** `TOSS_COIN` (section 30.1), placed before `RECOVER` in
  `COMMAND_KIND_ORDER_V7`; offered by the command query only to a unit
  that may toss. Any command naming a neutral unit is refused as before.
- **New events** (`DOMAIN_EVENT_KIND_ORDER_V7` places each next to its
  precedent): `GATE_DISPLACED`, `GATE_TRAVERSED`, `GATE_BLOCKED` (after
  `UNIT_MOVED`), and `COIN_TOSSED`. `MONSTER_BOUNTY_AWARDED` now pays each
  breed's bounty.
- **New reasons**: `MOVEMENT_ILLEGAL` `GATE_STOPS_MOVE`;
  `TOSS_COIN_NOT_LEGAL` `NOT_ON_WELL` and `ALREADY_TOSSED`.

### 32.5 Public queries and previews

- `PlayerViewV7.curiosities` lists the new markers on explored tiles (a
  gate with its `partner`, the Well with its `tossedBy`);
  `PlayerViewV7.monsters` lists every visible neutral unit with its
  `breed`.
- `previewMonsterV7(view, unitId)` covers every visible neutral unit and
  adds `breed`. For a guard: `home` (the camp centre), `area` (its
  standable tiles as far as explored), `provokeTiles` (saucer: the
  perimeter plus the tiles next to each visible guard of the camp;
  graveyard: the guard's `reachTiles`), `reachTiles` (every tile it could
  attack on its next turn after at most one step), `provokers`,
  `likelyTarget`. For Bigfoot: `area` (its habitat as far as explored),
  `provokeTiles` (the tiles within 3 of it: standing there makes it flee),
  `reachTiles` empty, `likelyTarget` null. `exact` is false when an
  unexplored tile lies within `1 + range` of a guard (2 for the Spider, as
  before) or within 3 of Bigfoot.
- `previewGateV7(view, unitId, gateAt)` for an own unit and a visible gate:
  `exit` (the partner), `displaces` (the visible occupant's ID or null),
  `displaceTo` (its tile by section 28.3, or null), and `blocked`. The
  movement query marks every gate destination with its `exit`.
- `queryCombatPreviewV7` sets `monsterRetaliates` for any visible hostile
  neutral target: true when neither side dies and, as positions stand, the
  attacker would be a candidate of that neutral unit (a guard: of any guard
  of its camp) at the next neutral turn; always false for Bigfoot.
  `queryThreatenedTilesV7` of a guard is its `provokeTiles` within its
  `reachTiles`; of Bigfoot, none.
- **Headless metrics:** `monsters` entries gain `breed`; new `gates`
  (`traversals`, `displacements`, `blocked`) and `well` (`tosses` by
  outcome).

## 33. Normal AI (round 2)

Bead `pulp_wars-737.15`. Everything reads the public view and previews; no
heuristic uses a stateless draw or hidden state, and each runs only when
the view has the curiosity it concerns, so a match without one keeps its
decisions and pinned hashes byte for byte.

- **Camps: avoid unless strong.** The Spider rules of sections 11 and 20
  apply to every visible guard with that guard's `provokeTiles`,
  `reachTiles`, and `monsterRetaliates`: no routine Move ends on a camp's
  `provokeTiles`, a unit already there with no attack on a seat's unit
  steps out when it can, and Normal attacks a guard only (a) in a hunt
  plan that kills it this turn (valued at its bounty plus the ordinary
  kill value) or (b) from outside every guard's reach. Never a sole city
  defender.
- **Threat.** Every visible guard is a threat to the own units on its
  `provokeTiles` within its `reachTiles`, with the ordinary damage estimate.
- **Gates.** When a unit's route goal is visible, the gate route (walk to
  a visible gate, traverse, walk on from its exit) counts as a route in
  the ordinary route choice when it is shorter by at least 3 turns. Normal
  never traverses onto an exit that holds an own unit, or whose exit is on
  a visible Spider's or camp's `provokeTiles`; it may displace an enemy.
- **Bigfoot: opportunistic.** Normal never makes a Move toward Bigfoot.
  It attacks Bigfoot only with a unit that has it among this turn's
  offered attacks (including after a Move the existing hunt plan finds)
  and no offered attack on a seat's unit.
- **Wishing Well.** When the seat has not tossed and has at least 3 Coins,
  the nearest own land unit that can stand on a visible free Well this turn
  (route within its Move), is not a sole city defender, and has no offered
  attack on a seat's unit walks there and tosses; a unit at half HP or
  less is preferred.

## 34. UI and art (round 2)

### 34.1 UI

Bead `pulp_wars-737.16`, extending the round-1 UI (section 19):

- **Board:** the camp centres, gates, and Well as tile overlays on explored
  tiles (drawn like the Fountain); guards and Bigfoot as units with no
  owner colour on the neutral base; the dock chip "Neutral" (and
  "Provoked" while a visible unit provokes the camp).
- **Selection:** a selected guard outlines its camp's area and shades its
  reach (the saucer's perimeter outlined too); a selected Bigfoot outlines
  its habitat as explored; a selected gate marks its partner.
- **Move preview:** a Move target on a camp's `provokeTiles` carries the
  provoked marker; a gate target shows the exit and, when the exit is
  occupied, the occupant's `displaceTo` (or "Blocked").
- **Well:** a "Toss a Coin" command in the dock while legal; the outcome as
  a toast and a log line.
- **Neutral turn:** played back like the Spider's ("The wilds stir"),
  every visible neutral unit's step, attack, and flight animated.
- **Help:** the five sentences of section 23 join the Curiosities section;
  the event log names each traversal, displacement, block, toss, and
  bounty. **Gallery:** the new sprites and overlays in the Curiosities tab.

### 34.2 Art (PixelLab, chibi direction)

Bead `pulp_wars-737.13`, under the
[curiosity class](../art/classes/curiosities.md) (neutral palette, no
faction colour, black outline, nothing under a tile overlay):

| Asset                                                                                                      | Kind                                    | Notes                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `CURIOSITY:DOWNED_SAUCER`                                                                                  | 80 x 80 overlay on Grass and Forest     | A tilted, half-buried flying saucer with a scorched dent and a few sparks; dull grey metal, no Martian colour. |
| `CURIOSITY:GRAVEYARD`                                                                                      | 80 x 80 overlay on Grass                | Three crooked headstones and a broken iron fence; weathered grey stone.                                        |
| `CURIOSITY:GATE`                                                                                           | 80 x 80 overlay on Grass and Forest     | One look for both gates: a ring of old standing stones around a swirl of white light.                          |
| `CURIOSITY:WISHING_WELL`                                                                                   | 80 x 80 overlay on Grass                | A round stone well with a little roof and bucket; a gold glint allowed (a coin).                               |
| `UNIT:NEUTRAL_BIGFOOT` and its portrait                                                                    | unit sprite (giant bounds) and portrait | Shaggy umber fur, big feet, a shy hunched pose; reads at zoom 0.75 by its silhouette.                          |
| Guards                                                                                                     | no new sprite                           | The Martian Grunt, Ray Gunner, and Shield Projector and the Undead Zombie, on the Spider's neutral base.       |
| `ICON:CURIOSITY:{DOWNED_SAUCER,GRAVEYARD,GATE,BIGFOOT,WISHING_WELL}`, `EFFECT:{GATE_TRAVERSE,COIN_SPLASH}` | icons and effects                       | Cut from the overlays; the traverse and splash effects are short sparkle bursts.                               |

LEGACY and Classic draw code markers (a saucer glyph, a headstone glyph, a
ring glyph, a footprint glyph on a neutral disc for Bigfoot, a well
glyph), shipped first so the rules are playable before the art.

## 35. Test plan (round 2)

### 35.1 Generation and the option

- **Off is unchanged:** for seeds 0–31, every size, AI count, map type,
  and faction mixes with and without Martian and Undead seats, the option
  off reproduces the previous identity byte for byte.
- **On changes no tile:** the same matrix with the option on has exactly
  the tiles of the option off; neutral units take the last entity IDs in
  placement order.
- **Exclusions and rules:** the hard checks of section 24.5 by the
  independent checker; the stream order of section 24.1 (composition and
  guard-tile draws pinned on chosen seeds); gate pairs at their separation
  and fairness; the one-danger rule.

### 35.2 Rules

- **Camps:** provocation per kind (perimeter, adjacency, a hurt, in reach
  for the graveyard; a provoker out of reach is no candidate); the target
  by HP then ID; a ranged guard firing without a step when in range and
  stepping to the first `(y, x)` tile otherwise; the Ray Gunner at half
  power after a step and never Cooling; the guards in unit-ID order on the
  board the earlier ones left; the wander draw; standable tiles (never the
  centre, never within 2 of a centre); no regeneration; each bounty; the
  cleared camp unchanged; immunities (one test per status and forced move
  per breed).
- **Gates:** the stop for every movement mode; traversal by `MOVE` and
  `DISEMBARK` only; no traversal for each forced move and placement; the
  clockwise displacement, the occupant's own terrain rule, and the blocked
  case; activation after traversal (act after Move, a landed unit
  exhausted); Crumbs on the entry gate; partner exploration on every kind
  of reveal; events and projection; never a tunnel destination.
- **Bigfoot:** alert at exactly 3 (not 4); the flee choice and its three
  tie-breaks; no passing through units; the habitat (Forest, centres,
  curiosity distance); never attacking or retaliating; the bounty.
- **Well:** each legality row; the cost; once per player; the draw per
  player independent of round and unit; each outcome (a construct's
  `HEAL`, `VISION` radius 5, a gate in the vision revealing its partner);
  projection.
- **Neutral-owner audit and fuzz** (section 32.3); **saves and replays**
  mid-match with every kind; hashes stable.

### 35.3 AI and headless

- Normal never ends a routine Move on a camp's `provokeTiles`; attacks a
  guard only under section 33; uses a gate only per section 33; never
  moves toward Bigfoot; tosses once with a safe unit.
- Matches without a new kind: decisions and pinned hashes unchanged.
- Headless `match` and `batch` with the option on complete without a
  structured failure on seeds that drew each new kind.

### 35.4 UI

Drawing of every new kind in the default and LEGACY looks; the gate
preview with an occupant and when blocked; the Toss a Coin command and its
toast; the neutral-turn playback with guards and Bigfoot; Help; the smoke
probe on a seeded board with a camp and the gates.

## 36. Acceptance criteria (round 2)

1. With `curiosities: false`, generation and every pinned match of the
   previous identity are reproduced; with `true`, no tile differs.
2. Every placed curiosity obeys section 24, with no exclusion ever broken
   (section 24.5) and the counts of section 4.2 unchanged.
3. Every rule of sections 25 to 31 is implemented and tested, with exact
   public previews for what the viewer can see.
4. The owner-reader audit and the fuzz cover every breed (section 32.3).
5. Normal plays matches with each new kind to completion without
   failures, as section 33 says; matches without them are byte-identical.
6. The board drawing, previews, the Well command, Help, and the art (or
   its LEGACY markers) are live, on phone and desktop.
7. The coarse check (bead `pulp_wars-737.17`, small and hand-played at the
   user's direction) finds no error or stall and records, per new kind,
   how often it was met, fought, used, or cleared; tuning stays inside the
   bounds of section 37.

## 37. Implementation beads (round 2)

| #   | Bead               | Scope                                                                                                                                                                                                                 | Validation profile                    | Depends on                |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------- |
| 1   | `pulp_wars-737.12` | This spec (sections 22 to 38, Appendix B).                                                                                                                                                                            | `docs/tracker`                        | —                         |
| 2   | `pulp_wars-737.13` | Art of section 34.2 (crashed saucer, graveyard, gate, Bigfoot, Well, icons and effects), sampled and reviewed by `npm run art:curiosities-review`; guards reuse the faction sprites on the neutral base.              | `asset-only`                          | 1                         |
| 3   | `pulp_wars-737.14` | Engine, one identity bump: generation (section 24), camps, gates, Bigfoot, the Well and `TOSS_COIN`, state, events, views, previews, the registration by breed, the audit and fuzz, the distribution validator, pins. | `ai/map/persistence`                  | 1, and `pulp_wars-w49.28` |
| 4   | `pulp_wars-737.15` | Normal AI of section 33, gated; tests of section 35.3.                                                                                                                                                                | `ai/map/persistence`                  | 3                         |
| 5   | `pulp_wars-737.16` | UI of section 34.1 with the LEGACY markers first, then the art of bead 2; Help, Gallery, the curiosities UI review, the smoke probe.                                                                                  | `ui/presentation` (+ `smoke:browser`) | 2, 3                      |
| 6   | `pulp_wars-737.17` | Coarse check (on versus off on seeds that drew each new kind) and fold into the current rules.                                                                                                                        | `cross-cutting/release`               | 4, 5                      |

The superseded user requests `pulp_wars-737.10` (saucer) and
`pulp_wars-737.11` (gates) are closed into bead 3. The round-1 AI
follow-up `pulp_wars-737.9` stays separate.

Tuning bounds for bead 6: guard bounties 2–6 each; Bigfoot HP 12–18,
bounty 8–15, alert radius 2–3, flee steps 2–3; Well Coins 3–6 and vision
radius 3–6; the weights of section 24.1 by at most 1 each; the gate
separation by at most 2. Composition odds, the one-danger rule, the user's
radius 2, and the exclusions are not tuning knobs.

## 38. Open questions for the user

Each has a default the engine bead applies unless the user answers
otherwise.

1. **Camp size.** Camps appear from 16 x 16 up, like the Spider (the
   2026-10-06 saucer note said "big maps"; the 2026-10-08 request did not).
   _Default: 16 x 16 and up._ Or only 20 x 20 and 25 x 25, like the gates?
2. **The camp's reward.** Each guard pays a small bounty (3 to 5 Coins; a
   whole camp 3 to 10) and the saucer and graveyard stay as scenery.
   _Default: bounties._ Or a salvage cache on the saucer that the first
   unit to step on it after the camp is cleared takes (B.2, C12)?
3. **The gate's occupant.** It is shoved to the first free tile clockwise
   from north around the exit. _Default: shoved aside._ Or swapped
   through the gate to the entrance (B.4)?
4. **Bigfoot.** A chase with a 12-Coin bounty, never fighting back.
   _Default: as specified._ Or a non-combat "sighting" that pays the first
   unit to end a Move next to it (B.2, C17)?
5. **The Wishing Well.** One toss per player per match, 1 Coin, one of
   four even outcomes (nothing, 5 Coins, a full heal, a radius-5 reveal).
   _Default: as specified._ Other outcomes, or one toss per unit?
6. **Rarity.** The new kinds share the old count of curiosities per board,
   so each round-1 kind (including the Spider) becomes roughly half as
   common, and a board never has more than two curiosities. _Default:
   share the count._ Or raise the count on 20 x 20 and 25 x 25 by one?
7. **One danger per board.** Never a Spider and a camp, or two camps, on
   one board. _Default: one danger._ Or allow two?

## 39. Implementation notes (`pulp_wars-737.14`)

Engine step 3 of section 37 is implemented: generation (section 24), the
camps, the gates, Bigfoot, the Well and `TOSS_COIN`, the state, events,
views, and previews, the registration by breed, the owner-reader audit and
the fuzz, and the distribution validator. The identity bump of section
32.1 is `pulp-wars-poc-7r66` (published after score and modes, `7r65`,
which it rejects, with a new autosave key; it was built on `7r59` and
rebased over the Dwarf crowd control, Goblin Berserk, the giants'
signatures, the reward ladder, any unit can capture, and score and modes).
Every open question of section 38 took its default. Where this
part was silent or did not fit the code, the implementation rules as
follows:

- **The roster's breeds.** `FactionRosterV7` gains an optional `monsters`
  list (the state's and the view's carry it). A roster without it (the
  setup and role-level reads, and the partial rosters some chains build)
  resolves a neutral unit's breed from its role and maximum HP
  (`neutralBreedOfV7`), which is exact because parsing pins each breed's
  role and maximum HP and the two `GUARD` breeds differ in maximum HP (the
  Zombie 18, the Shield Projector 15).
- **The registration.** Every breed has Sight 0 and `cost` null and may act
  after its step. Bigfoot's row is `RAIDER`, Attack 0, range 0 (minimum
  range 1, so no distance is ever in range), Move 3 (its flight), and no
  ability; its Defense 2 and Forest cover come from the ordinary defence.
  The mechanics are the Original faction's of each role with no advance, no
  Field Defense, and Shield 0; the Ray Gunner's carry `heatSink`, and
  `rayOverheatsV7` reads it for a neutral unit without the Heat Sinks
  technology, so its full-power ray never adds a `cooling` entry.
- **Immunities by owner, not role.** The Spider was immune to Mind Control,
  Knockback, and the Candy Bounce through its `JUGGERNAUT` role; a guard or
  Bigfoot is not one, so `mindControlTargetBlockV7`, Knockback (canonical
  and public), and `attackIsBouncedV7` now also refuse a neutral unit
  (the status immunity, Push, and the Tractor Beam already read the
  owner).
- **A guard's reach.** "Within its range" also applies the naval branch's
  rule that a submerged Submarine is hit only from next to it (a Grunt or
  Ray Gunner would otherwise shoot one from 2). The Spider's choice is the
  same function with range 1, so its behaviour is unchanged.
- **Bigfoot's habitat at placement** excludes the tiles within 3 of the
  curiosities placed before it; a curiosity placed after it may shrink the
  habitat below 12 (rule 5 still keeps its home 5 from it). Parsing checks
  that Bigfoot stands on its current habitat. The independent checker
  counts the habitat without the other curiosities (it cannot know the
  order).
- **The count.** The gate pair is one curiosity of the count table; a
  camp's guards are not curiosities of their own.
- **Gates.** A gate stops a Move only on an explored tile in the public
  validator (an unexplored tile stops a Move anyway). `GATE_BLOCKED`'s `at`
  is the entry gate. A traversal by `DISEMBARK` moves the landing's own
  `TILES_REVEALED` up, before the gate events (otherwise it comes last, as
  before). A `BOMB_RUN` that ends on a gate is not a traversal (section
  28.2 names `MOVE` and `DISEMBARK` only); a Gyrocopter's `MOVE` is. The
  tunnel-tile rule's "not a gate" also applies to an Assemble, which shares
  it. A displaced occupant never lands on water (the land-form
  `canEnterTerrainV7`), except on ice it may enter. Crumbs never lie on a
  curiosity tile (the Candy rule), so the "Crumbs on the entry gate" of
  section 28.2 cannot occur; the order (end-of-Move steps, then the
  traversal) is implemented.
- **Occupancy.** A neutral unit's step, Bigfoot's flight, and the gate
  displacement ask the ordinary occupancy predicate (`tileOccupiedV7`) of
  the whole state or view, so every blocker it knows (a unit, a mound, a
  Dwarf Barricade of `pulp_wars-w49.33`) keeps them off a tile. A Barricade
  never stands on a curiosity tile (a gate, the Well, a camp centre), but
  may stand in a camp's area, in Bigfoot's habitat, or next to a gate,
  where it closes that tile to a guard's step, Bigfoot's flight, and a
  displacement (it may block a traversal). A neutral unit never attacks a
  Barricade: only units provoke it.
- **The giants' signatures** (`pulp_wars-w49.30`). No neutral breed has a
  signature (their abilities are `ATTACK` and the Ray Gunner's
  `HEAT_RAY`). Swallow refuses every neutral unit (`IMMUNE`), a Crushing
  Shove never pushes one, and the Glacial Smash shards never freeze one
  (Ice Folk Freeze, `pulp_wars-w49.37`: Frozen, Chill before). A
  Goblin Toss, a Break Off, and a regurgitation never place a unit on a
  curiosity tile, so never on a gate; an Overstride is a `MOVE`, so it
  stops on a gate and traverses, and tramples a guard or Bigfoot it steps
  over. Provocation also counts the Crushing Shove's crush on the target
  and on the unit it is shoved into (`UNIT_CRUSHED`), with the Stomp, the
  trample, the Whirl, the Wail, the bombs, and the eruptions.
- **Score** (`pulp_wars-kaw6.2`). Every neutral unit is worth its bounty
  (the Spider 10, a Grunt 3, a Ray Gunner or Shield Projector 4, a Zombie
  5, Bigfoot 12): a seat's credited kill of one adds that to its kills
  once, and a neutral unit's kill of a seat's unit is that seat's loss and
  nobody's kill. Any unit can capture (`pulp_wars-ke95`) changes nothing
  here: a neutral unit never captures and never stands within 2 of a
  centre.
- **The partner reveal** is one pass after every accepted command: for
  each player, a newly explored gate's partner joins the command's
  `TILES_REVEALED` of that player that lists the gate (a new
  `TILES_REVEALED` at the end when none does, which play never produces).
- **`previewGateV7`** adds `exact`: a foreign occupant's Engineering is
  private, so the tile is computed with and without it and `exact` is false
  when they differ (`displaceTo` then assumes none). The movement query's
  gate marks are `queryGateDestinationsV7(view, unitId)`, the previews of
  the unit's offered `MOVE` destinations that are gates.
- **`TOSS_COIN`** settles city rewards and evaluates achievements like a
  `MOVE` (a `VISION` may complete Explorer). A Coin outcome adds 5 after
  the 1 paid, overflow-checked.
- **Headless metrics.** `monsters` gains `breeds` (placed, in unit-ID order)
  and `slain`; its `slainRound` stays the Spider's. New `gates`
  (`traversals`, `displacements`, `blocked`) and `well` (`tosses` by
  outcome).
- **The distribution validator** now runs two faction mixes per setup with
  distinct factions (no Martian or Undead seat; both), instead of the
  duplicate Original seats, and counts kinds per mix, map type, and size.
  The map-scale validator's "factions do not change the map" check now
  strips the curiosities when two lineups differ in a Martian or Undead
  seat (section 24.1 makes the curiosities depend on them).
- **Pins.** The kind-order pins count 67 command kinds and 119 event
  kinds, and the revision-12 ordinal fixture lists `TOSS_COIN` (inserted
  before `RECOVER`, it shifts the ordinal of every later kind, which the
  Normal AI's tie-break tuples carry). Tests that pinned a seed for a
  curiosity moved to a seed that draws it under the nine-kind draw: the
  Shrine round trip to seed 17 (from 12), the Spider round trips and the
  browser-controller test to seed 8 (from 11), the Spider headless matches
  to Pangea seed 150 (149) and Dry Land seed 7 (11). The tests that play
  matches (pinned match and replay hashes, the headless and browser
  matches) were not rerun by this bead (whole-game simulations run only
  when the user asks).
- **Presentation.** Until bead 5 (`pulp_wars-737.16`) the board draws only
  the round-1 markers and the Spider's web; a guard or Bigfoot is drawn as
  a neutral unit with its role's base art, like the Spider before its UI.
- **Normal AI** (bead 4, `pulp_wars-737.15`) is unchanged and stayed legal
  in a worker fuzz (not checked in: whole-game simulations run only when
  the user asks) that played Normal five rounds beside every camp
  composition, Bigfoot, the gates, and the Well with all eight factions,
  and in 20-round headless matches on seeds that drew each new kind. It
  treats every neutral unit through `previewMonsterV7`
  like the Spider, so it avoids a saucer's perimeter and a Zombie's reach,
  and also the tiles within 3 of Bigfoot (its provoke tiles); it never
  plans a route through a gate and has no Well heuristic.
- **Measured distribution** (`npm run validate:ruleset7-curiosity-maps`,
  seeds 0–31, every map type, size, and AI count, in both faction mixes:
  3,840 boards; PASS with every hard check of section 24.5). Totals over the
  1,920 boards of each mix, with no Martian or Undead seat / with both:
  Spider 201 / 260, Fountain 348 / 391, Shrine 254 / 318, Wreck 715 / 705,
  Downed Saucer 126 / 0, Graveyard 100 / 0, gate pairs 23 / 37, Bigfoot
  20 / 21, Wishing Well 95 / 148. Per 96 boards of a type at widths 16, 20,
  and 25 (the mix with no Martian or Undead seat): Dry Land saucers 9, 15,
  17, Graveyards 7, 9, 18, gates 0, 2, 10, Bigfoot 0, 0, 9; Pangea saucers
  16, 10, 12, Graveyards 7, 12, 18, gates 0, 0, 6, Bigfoot 0, 2, 8; Lakes
  saucers 15, 15, 17, Graveyards 11, 4, 14, gates 0, 0, 5, Bigfoot 0, 1,
  0; Continents and Archipelago none of the four (a Well on 3 or 4 of the
  25 x 25 boards and one 20 x 20 Archipelago board), as section 24.5
  expected. The gates are rare below 25 x 25 (rule 6 and the fairness
  rule leave few pairs on 20 x 20) and Bigfoot needs a 25 x 25 Forest; the
  per-board counts of section 4.2 are unchanged (for example 16 x 16 Lakes:
  3 boards with none, 93 with one).

## Appendix A. Draft, critique, and changes

### A.1 Draft 1

Draft 1 had the same four kinds and the neutral-owner Monster, with these
differences: the Fountain **fully healed** its occupant; the Monster's
targeting had **two tiers** (units that damaged it first, then adjacent
units); it **wandered from a stored PRNG stream** (`curiosityRandom` in the
state); it took **Plague, Bitten, and Chill** like any living unit, so the
neutral turn needed its own Start and End Turn status steps; placement
fairness was a **Chebyshev distance band only**; the Monster's corridor
check covered only the **3 x 3 around its home**; the counts were **1 on
14 x 14 and 16 x 16, 2 or 3 on 25 x 25**; the Monster was allowed from
14 x 14.

### A.2 Critique (as a skeptical designer)

- **C1. Fountain fortress.** A full heal every turn is free and unlimited:
  a Juggernaut, Abomination, Troll, Brontosaurus, Colossus, Frost Giant, or
  Brass Titan (36–45 HP, Defense 3–4) parked on it needs about 40 damage in
  one round to die, roughly seven good hits. Placement puts the Fountain
  between the capitals, i.e. on the front. That is a degenerate wall, not
  an "occasional consideration". A two-unit rotation (step off, step on)
  also makes it a free forward hospital. **Change:** heal 12 (full for most
  units, a strong but finite heal for big bodies: three Knights a round
  beat a Juggernaut on it). Asked as open question 1.
- **C2. Fountain next to a capital, Monster camping a village.** The draft
  already kept curiosities 3 from every center and 5 from capitals; the
  critique checked the consequence: territory never reaches 3, so no
  curiosity is ever owned, fortified, or built on, and a Monster whose
  home is 5 from every center has an area 3 or more from every center: it
  can never be next to a center, a ring tile with an Egg, or a capturer.
  **Kept**, and the "never within 2 of a center" rule is stated explicitly
  for the Monster too (not only as a placement consequence).
- **C3. Home-island advantage.** A Chebyshev band says nothing about water:
  on Continents or Archipelago a land curiosity on one player's home island
  is that player's private bonus (a private Fountain is a big deal; a
  private Monster is a private bounty). **Change:** land curiosities only
  on a landmass with two or more capitals or none (rule 6); the Wreck only
  in water touching every capital's landmass (rule 7).
- **C4. Stalls and blocked routes.** A Monster standing in a one-tile land
  corridor blocks it (units cannot pass through a non-own unit), and its
  random wander could leave it there for several rounds; on Move-1 units
  the AI's routes would jam. The draft checked only the 3 x 3 around home,
  but it wanders 2 from home. **Change:** no tile of the whole area may be
  a cut tile of the land graph (with or without Mountains). Blasting a
  Mountain only adds connectivity, so the guarantee holds all match.
- **C5. ZOC trap.** A Monster with ordinary land ZOC would stop every unit
  that walks past it on the tile next to it, where it then attacks: a
  passive trap that punishes walking by, not provoking. **Kept the draft's**
  "no ZOC".
- **C6. Two-tier targeting is not one sentence.** "Attackers first, then
  neighbours, each by lowest HP" needs a paragraph. **Change:** one tier,
  "the weakest unit that stood next to it or hurt it". Baiting it with a
  cheap weak unit to protect a wounded one becomes a readable trick, which
  is fine.
- **C7. Statuses on a unit with no turn.** Plague resolves at the owner's
  Start Turn and Chill counts down at the owner's End Turn; a neutral owner
  has neither, so the draft had to invent both inside the neutral turn,
  plus Bitten and Infect risings of a 24-HP body into a 10-HP Zombie for an
  Undead seat (a cheap way to farm a Zombie off a neutral). **Change:** the
  Monster is immune to every status (Plague, Bitten, Infect, Chill, Mind
  Control) and to every forced move. Damage-only interaction is one
  sentence and removes the neutral Start and End Turn steps.
- **C8. A stored PRNG stream for a few wander steps.** The draft added a
  `curiosityRandom` field to the state for the wander. **Change:** a
  stateless draw seeded from the match seed, the round, and the unit ID
  (the Rift stream precedent, per draw): no state field, still exact in
  replays, never touches the match stream.
- **C9. "Very rare."** With one curiosity on every 14 x 14 and 16 x 16
  board, every game has one: that is common, not rare. **Change:** the count
  table of section 4.2 (0.33, 0.5, 1, 1.5, 2 expected), the Monster from
  width 16 only (its 7 x 7 threat region is a quarter of a 14 x 14 board),
  and at most one of each kind. Asked as open question 3.
- **C10. Kiting and bounty farming.** Hit it from outside its reach and run:
  the draft's regeneration (4) already defeats chip damage from weak
  ranged units (a Marksman deals about 5), while a Catapult or a Battleship
  can legitimately hunt it in three rounds for an 8- or 16-Coin unit's
  time; that is a fair hunt, not an exploit. No respawn means no farming
  of kills, Slayer, Plunder, or bounty. **Kept.**
- **C11. Weaponising the Monster.** Pulling, pushing, or beaming an enemy
  next to it, or shooting it from range while an enemy stands beside it,
  makes the Monster hit the enemy. **Kept** as intended play (a
  "consideration"); Normal does not do it on purpose (section 11).
- **C12. AI blind spots.** The draft's AI rules did not say what happens to
  a unit already standing next to a Monster, ignored `provokedBy` in the
  threat estimate, and let the AI chip the Monster forever. **Change:** step
  away when possible; `provokedBy` in the threat; ranged chip only above the
  regeneration and only by an otherwise idle unit; never a sole defender
  for any curiosity; every heuristic gated so matches without curiosities
  keep their hashes.
- **C13. The neutral owner breaks Cooperative alliances.** Today two
  non-human seats in a Cooperative match are allies; a naive neutral ID
  would be "allied" with every AI seat. **Change:** called out as a pitfall
  (section 8.1) and covered by the audit test (section 10.5).
- **C14. Shrine and Wreck are chest variants.** The skeptic asked whether
  they add a real decision or only noise. The Shrine adds **which unit** to
  send (a Knight gains 50% HP, a Captain becomes durable), which a chest
  does not; the Wreck is the only reason to put an early boat to sea on
  water maps, where condition 6 often leaves no land site. Both kept;
  standing stones (vision), cursed bogs, and a lair that respawns the
  Monster were rejected (section A.4).
- **C15. Showcase and tools.** The draft did not say what the Showcase or
  the existing balance tools do. **Change:** the Showcase has none; every
  existing tool passes `false` explicitly so faction balance stays
  comparable.

### A.3 What the redraft changed

Fountain heal 12 (C1); explicit center distance for the Monster (C2), and
curiosity spacing 5 instead of 6 once the Monster's reach was recomputed (3
from home, not the 4 draft 1 assumed);
landmass fairness for land kinds and the Wreck (C3); cut-tile check over
the whole area (C4); one-tier targeting (C6); status and forced-move
immunity, which removed the neutral Start and End Turn steps (C7); the
stateless wander draw instead of a stored stream (C8); the rarer count
table, the Monster from width 16, and one of each kind (C9); the AI rules
(C12); the Cooperative pitfall and the audit (C13); the Showcase and tool
rulings (C15).

### A.4 Ideas weighed and rejected

- **Standing stone (vision):** a unit on it sees farther. Fog only ever
  grows and Survey, Raiders, and Mountains already give sight; the decision
  it adds is negligible.
- **Cursed bog** (damage or a stop on a patch of tiles): friction, not a
  decision; it would also need pathing work in the AI and the movement
  query for a feature that appears on one map in five.
- **A beast lair that spawns Monsters:** respawning neutrals invite kill and
  bounty farming and grow the neutral turn without end. The lair survives
  only as the web that marks the Monster's home.
- **A Monster that chases beyond its area:** luring it into an enemy's
  cities would be fun once and griefing afterwards; the leash of 2 keeps
  every encounter local and readable.

## Appendix B. Round 2: draft, critique, and changes

### B.1 Draft 1

Draft 1 took the user's words and the root's two proposals as literally as
possible and reused round 1 where it could:

- **Counts:** the five new kinds were **added on top** of section 4.2: one
  more curiosity on every 20 x 20 and 25 x 25 board, drawn only from the
  new kinds.
- **Saucer camp:** on any board without a Martian seat; the guards were
  ordinary Martian-kind units under the neutral owner, with their
  **Shields, Force Field, and Cooling**; "too close" was **within 2 of any
  guard**; the camp's reward was a **salvage cache** (10 Coins) that the
  first unit to end a Move on the saucer took once every guard was dead.
- **Graveyard:** two Undead-kind Zombies with **Bite and Infect** (a unit
  they killed rose as a third neutral Zombie); "on sight" was their Sight
  of 1, so they attacked only units next to them; no reward.
- **Both camps** could appear with a Spider on the same board; the Zombie
  and Shield Projector kept "cannot attack after moving".
- **Gates:** placed on **mirrored tiles** (`(x, y)` and
  `(width − 1 − x, height − 1 − y)`); a unit **passing over** a gate
  anywhere in its path was moved to the other and **continued its Move**
  with the movement left; the occupant was displaced to a **random free
  neighbour drawn from the match PRNG**; nothing told a player where the
  exit was or who stood on it.
- **Bigfoot:** wandered **every Forest tile of the map**; fled **4 tiles**
  when any unit came within 2; Defense 2, retaliated normally; bounty
  **20** Coins.
- **Wishing Well:** `TOSS_COIN` was a **free action** (not a primary
  action) any unit could take **any number of times**, 1 Coin each, with
  the outcome drawn from the **match PRNG**; the reveal outcome explored
  radius **3** around the Well.

### B.2 Critique (as a skeptical designer)

- **C1. Rarity creep.** One more curiosity on every big board turns "very
  rare" into "every big board has two or three", and the camps and gates
  are the biggest of all. **Change:** the counts of section 4.2 stand; the
  new kinds share the draw by weight (section 24.1). The round-1 kinds
  become rarer; asked as open question 6.
- **C2. Danger stacking.** A Spider plus a saucer camp, both between the
  capitals, blocks the middle of a 20 x 20 board with two kill zones and
  turns colour into terrain. **Change:** one danger per board (pillar 6).
  Bigfoot and the gates are not dangers. Asked as open question 7.
- **C3. Martian Shields on a neutral unit.** The `shields` and `cooling`
  lists are rejected in a match without a Martian seat, which is exactly
  where the saucer appears; the recharge runs at the owner's Start Turn,
  which the neutral owner never has; Force Field needs a technology it
  never has. Keeping them means a neutral Start Turn, the step round 1
  deleted (section A.2, C7). **Change:** the Shield maximum is folded into
  HP, the Force Field is gone, and the Ray Gunner has the Heat Sinks
  behaviour (full when it did not step, half after a step, never Cools).
- **C4. Infectious Zombies.** Bite and Infect need the Bitten and Plague
  lists (empty without an Undead seat), and an Infect kill raising a third
  Zombie is a growing, respawning neutral, which round 1 rejected
  (section A.4). **Change:** a neutral Zombie has `ATTACK` only.
- **C5. "Too close" around a moving guard.** A zone of 2 around each guard
  moves every round, cannot be drawn as one outline, and reaches 4
  from the saucer, into village territory. **Change:** the saucer's perimeter is fixed, within 2 of
  the saucer (the user's own radius), plus the tiles next to a guard and
  any unit that hurt one; a guard's reach stays within 4 of the saucer.
- **C6. "On sight" as Sight 1.** With the Zombies' Sight of 1, "attack
  anyone on sight" would mean "attack only what stands next to them", no
  different from the Spider and weaker than the user's words. **Change:**
  every unit is a Zombie provoker; reach bounds it (3 from the graveyard),
  which is what "on sight" means on a board with no live fog.
- **C7. Shamblers that cannot strike.** With "cannot attack after moving"
  a Zombie or Shield Projector steps toward a unit and does nothing, which
  reads as a bug, and the reach preview would need two cases. **Change:**
  every guard may attack after its one step, as the Spider does.
- **C8. Role collision.** The round-1 registration is keyed by role, but
  the Zombie and the Shield Projector are both `GUARD`. **Change:** a
  `breed` on every `monsters` entry keys the registration (section 32.3).
- **C9. Gates on mirrored tiles.** A mirror tile is often water, a Rift, a
  village, or someone's backyard; with 3 or 4 seats a mirror pair can sit
  next to one capital and far from the rest. **Change:** a pair of legal
  gate tiles, at least two thirds of the width apart, each 5 from every
  capital, with every capital's nearer gate within 4 of every other's
  (section 24.4).
- **C10. Gates in mid-path.** Teleporting a passing unit and letting it
  continue needs paths through two places at once, ZOC and terrain stops
  at the exit, Road costs across the jump, and a preview of a Move that
  may end twenty tiles away; and a gate in a corridor would teleport
  everyone who walks by. **Change:** entering a gate always ends the Move
  (a stop like deep snow), only a step onto it traverses, the unit may
  still act, and a gate is never a cut tile.
- **C11. Random, hidden displacement.** A random neighbour from the match
  PRNG makes the result unpreviewable and shifts every later PRNG draw of
  the match, and an exit the mover cannot see makes displacement a blind
  gamble. **Change:** a fixed clockwise order with the occupant's own
  terrain rule, a defined blocked case, a public preview, and the partner
  explored together with its gate (section 28.5).
- **C12. The salvage cache.** A cache taken by "the first unit to step on
  it after the last guard dies" rewards the vulture, not the player who
  fought: the clearer's unit is usually hurt, and a fresh enemy unit
  steps in. It also needs a claim rule, a looted flag, and an AI errand.
  **Change:** each guard pays a small bounty to whoever is credited with
  its kill, and the camp stays as scenery. Asked as open question 2.
- **C13. Bigfoot everywhere.** Wandering every Forest of the map takes it
  through territories, onto corridors, and across the whole board in a
  chase no one can plan; a 4-tile flight with an alert at 2 means a Move-1
  unit never reaches it, and a bounty of 20 is twice the Spider's for a
  target that cannot hurt anyone. **Change:** a habitat of Forest within 4
  of home, 3 from every centre and every curiosity, with no cut tile; an
  alert at 3 and a flight of up to 3 (a Knight, a Raider, ranged units, or
  a pocket catch it); bounty 12.
- **C14. A punching bag that punches.** "Never attacks" with normal
  retaliation makes Bigfoot hit back at every hunter, which reads as an
  attack. **Change:** range 0, so it never retaliates (the existing
  `OUT_OF_RANGE` reason, no new rule).
- **C15. A Well as a slot machine.** Unlimited free tosses are a Coin pump
  (positive expected value) and, drawn from the match PRNG, make every
  later draw of the match depend on how often someone tossed, and let a
  player reorder commands to fish for an outcome. **Change:** a primary
  action, once per player per match, outcome from a stateless draw keyed
  by the seed and the player (section 30.2).
- **C16. A useless reveal.** Radius 3 around the Well adds almost nothing
  to what the tossing unit already sees. **Change:** radius 5, which shows
  the surrounding region, including a gate (and so its partner).
- **C17. Is Bigfoot the best small idea?** A non-combat "sighting" (pay the
  first unit that ends a Move next to it) was weighed: it is gentler, but
  it needs a new "cannot be attacked" rule in every attack, preview, and
  AI path and a new claim trigger, while a hunt reuses the neutral owner,
  the bounty, and the Spider's turn, and a chase is the better story.
  **Kept** as a hunt, narrowed by C13 and C14. Asked as open question 4.
- **C18. Is the Well the best small idea?** An automatic wish on stepping
  onto the Well (no new command) was weighed: it keeps round 1's "no new
  command", but it removes the only decision the Well offers (when to
  toss: wounded, so `HEAL` matters; early, so `VISION` matters), and the
  root's "may" asks for a choice. **Kept** with one command, narrowed by
  C15 and C16. Other small ideas are in B.4.
- **C19. Neutral when absent, again.** Gates add a movement stop and the
  Well a command; both must vanish on boards without them, and the AI's
  new heuristics must not touch matches without them. **Change:** the
  stop, the command, and every heuristic exist only with their curiosity
  (pillar 5, section 33).

### B.3 What the redraft changed

The shared count and the weights (C1); one danger per board (C2); the
folded Shields, no Force Field, and the never-Cooling ray (C3); `ATTACK`
only Zombies (C4); the fixed perimeter (C5); "on sight" as reach (C6);
step-then-attack guards (C7); the breed key (C8); legal, fair gate pairs
(C9); the gate stop and traversal by a step only (C10); clockwise
displacement, the blocked case, and partner exploration (C11); bounties
instead of a cache (C12); Bigfoot's habitat, alert, flight, and bounty
(C13); its range 0 (C14); the Well's primary action, once per player, and
stateless draw (C15); its radius 5 (C16); the gating of every new rule
(C19).

### B.4 Ideas weighed and rejected

- **Swapping through the gate:** the occupant goes to the entrance instead
  of aside. Always possible and elegant, but it lets a player pull an
  enemy from the far side into its own army; the user said "displaced".
  Asked as open question 3.
- **A gate cooldown** (one traversal per gate per round): it would stop a
  conveyor of units, but the exit's occupant is already shoved aside each
  time and a gate pair is a deliberate shortcut; it adds state for little.
- **Damage on displacement** ("telefrag"): makes the gate a weapon and
  needs kill credit for a teleport; colour, not combat.
- **More easter eggs:** a **crop circle** (Martian-themed, a Survey-like
  reveal; overlaps the Well's `VISION`), a **message in a bottle** (a
  floating Wreck variant; overlaps the Wreck), a **fairy ring** (a random
  teleport; overlaps the gates and is not previewable), and a **lost
  traveller** (a neutral unit that joins whoever reaches it; a free unit
  is a balance swing, not an easter egg).
- **Respawning camps:** guards that return after a few rounds invite
  bounty farming (round 1's reason, section A.4).
