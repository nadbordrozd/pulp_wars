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
