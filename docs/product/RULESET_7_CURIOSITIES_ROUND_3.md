# Ruleset 7: map curiosities, round 3

**Status:** design (`pulp_wars-737.19`, epic `pulp_wars-737`), written on
2026-10-19 over the rules as built at `pulp-wars-poc-7r101`, with the Dwarf
Gyrocopter change of `pulp-wars-poc-7r102` landing in parallel. Bead A
is built (`pulp-wars-poc-7r103`, notes in section 17), and so is bead B,
the Sea Serpent (`pulp-wars-poc-7r104`, notes in section 18). Two implementation beads build it (section 15): bead A
(the four land curiosities, `pulp-wars-poc-7r103`) and bead B (the naval
one, `pulp-wars-poc-7r104`). No game was played or simulated to write it
(the user's standing rule); every number is a first guess for hand-play
tuning, and the exchanges quoted are computed by hand with the damage
formula of [current rules section 13.2](RULESET_7_CURRENT.md#132-damage).

**Source.** The user, 2026-10-19: "come up with and implement 5 more
curiosities on the map including 1 naval one."

**Fixed by the user:** five more kinds; one of them naval. Everything else
is a ruling of this design, made under the standing preferences: beta
first, then balance; fun, situational, sometimes overpowered moments are
welcome; readable on the board; a compact interface with details behind
"?"; targets picked on the board with highlights; every faction can
interact.

**Overlay.** This document overlays
[current rules section 2.7](RULESET_7_CURRENT.md#27-map-curiosities) (round
1 and round 2 as built) and the
[map curiosities spec](RULESET_7_MAP_CURIOSITIES.md). Where it names a
round-1 or round-2 rule, it means that rule as the code implements it
today (spec sections 17 to 21 and 39 to 41). Every rule this document does
not mention stays in force.

## 1. Summary

| #   | Curiosity           | Where                                        | One sentence (the Help and dock text)                                                                                                                 | Role in the mix                          |
| --- | ------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 10  | **Tesla Tower**     | Grass or Forest, boards 16 and up            | A unit standing on the Tesla Tower may zap an enemy within 2 of it for 4 damage instead of attacking.                                                 | rewards holding and defending a point    |
| 11  | **Moon Gun**        | Grass, boards 16 and up                      | A unit standing on the Moon Gun may be fired to any empty land tile within 5 of it; the Gun fires once a turn.                                        | changes movement                         |
| 12  | **Gold Claim**      | Grass or Forest, boards 14 and up            | A unit that ends a Move on the Gold Claim stakes it for its owner; the Claim pays its owner 2 Coins each turn until its 30 Coins run out.             | a lasting map feature that changes hands |
| 13  | **Lost Expedition** | Grass or Forest, any board                   | The first unit that ends a Move on the Lost Expedition finds its notes: its owner's next technology costs nothing.                                    | a one-time reward                        |
| 14  | **Sea Serpent**     | Deep Water, boards 16 and up, never Dry Land | A Sea Serpent owned by nobody prowls its waters and, after every round, swims up to 2 tiles to bite the weakest unit that came next to it or hurt it. | the naval one: a neutral threat          |

The numbers are the kinds' places in the frozen placement order (round 1
and round 2 hold places 1 to 9).

**Why these five.** Each does something no earlier curiosity does: the
Tower is the first point a player _holds_ for an effect (a turret anyone
can man), the Gun the first one-way jump chosen on the board, the Claim the
first curiosity that changes hands and pays over time (the Heroes of Might
and Magic mine), the Expedition the first reward that is a technology, and
the Serpent the first danger at sea, so water maps (Continents and
Archipelago), where no land danger ever fits, get a monster too. The
rejected ideas are in [Appendix A](#appendix-a-ideas-weighed-and-rejected).

## 2. Pillars

The pillars of round 1 and round 2 hold (spec sections 2 and 23): colour
first, tactics second; rare; every rule visible and one sentence; simple;
neutral when absent; one danger per board. Round 3 adds:

1. **A thing to do, not only a thing to see.** Each new kind is used by a
   unit's ordinary Move or by one command chosen on the board (Zap, Fire);
   the targets are highlighted on the board, never a list of buttons.
2. **Every faction can use every land kind.** Each is used by any own unit
   in land form, whatever its faction, role, or movement mode; no new kind
   asks for a technology. The Serpent is fought by every navy and by the
   Ice Folk from their ice and the shore.
3. **Two new commands at most.** `ZAP` and `FIRE_MOON_GUN`; the Claim and
   the Expedition act inside `MOVE`, the Claim's payout inside Start Turn,
   the Serpent inside the neutral turn.

## 3. Generation

### 3.1 Kinds, order, weights, and eligibility

Placement keeps the round-1 stream and procedure (spec section 4.1 and
24.1: its own Mulberry32 stream, never the match stream, run after the
chests and the Rifts, no board ever rejected). The five new kinds are
**appended** to the frozen draw order, so the order of the nine existing
kinds is unchanged:

| #   | Kind              | Weight | Board                          | Seats | Terrain of its tile   | Danger  |
| --- | ----------------- | -----: | ------------------------------ | ----- | --------------------- | ------- |
| 1–9 | (round 1 and 2)   |  as is | as is                          | as is | as is                 | as is   |
| 10  | `TESLA_TOWER`     |      2 | width 16 or more               | any   | Grass or Forest       | no      |
| 11  | `MOON_GUN`        |      2 | width 16 or more               | any   | Grass                 | no      |
| 12  | `GOLD_CLAIM`      |      2 | width 14 or more               | any   | Grass or Forest       | no      |
| 13  | `LOST_EXPEDITION` |      2 | any                            | any   | Grass or Forest       | no      |
| 14  | `SEA_SERPENT`     |      2 | width 16 or more, not Dry Land | any   | Deep Water (its home) | **yes** |

`CURIOSITY_DANGER_KINDS_V7` gains `SEA_SERPENT`: once the Spider, a camp,
or the Serpent is placed, the other dangers are not eligible (pillar 6 of
round 2). The draws of the stream keep the order of spec section 24.1;
every new kind draws nothing after its site draw (the Serpent's home is
its site; it is created on it).

**Entities.** The Sea Serpent is a neutral unit created after every other
initial entity, in placement order with the other neutral units (round 2's
rule). The four land kinds are tile markers only and create no entity.

### 3.2 How many: the count table changes on big boards

Fourteen kinds now share the slots, so every kind would be about a third
rarer than at round 2 if the count stood still; the user asked for "more
curiosities on the map". The count draw of spec section 4.2 changes on the
two largest sizes only:

| Board width | Round 1 and 2                       | Round 3                                 | Expected |
| ----------: | ----------------------------------- | --------------------------------------- | -------: |
|          11 | 1 with probability 1/3, otherwise 0 | unchanged                               |     0.33 |
|          14 | 1 with probability 1/2, otherwise 0 | unchanged                               |      0.5 |
|          16 | 1 (no draw)                         | unchanged                               |        1 |
|          20 | 2 with probability 1/2, otherwise 1 | **2 (no draw)**                         |        2 |
|          25 | 2 (no draw)                         | **3 with probability 1/2, otherwise 2** |      2.5 |

Small boards stay as rare as before (they are crowded with villages, and
one curiosity on a 14 x 14 board already sits in everyone's way). The
one-danger rule still allows at most one hostile neutral group per board.
This is a taste call (section 16).

### 3.3 Where: the shared rules

Every new kind's tile obeys rules 1 to 6 of the round-1 site rules as
implemented (current rules section 2.7, "Where"): off the edge ring; no
settlement site, chest, resource, improvement, or Rift; 3 or more from
every settlement centre; 5 or more from every capital with at most 4
between its farthest and nearest capital; **5 or more from every
curiosity tile already placed** (6 when one of the two is the Serpent's
home, section 3.4); and for the four land kinds, a shared or neutral
landmass reached over land without Mountains.

### 3.4 Where: each new kind

| Kind              | More                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TESLA_TOWER`     | The Spider's lair distances: **5 or more from every capital and 4 or more from every village centre**, so the zap (radius 2) never reaches a unit on a settlement centre or its first ring.                                                                                                                                                                                                                                                                                                                               |
| `MOON_GUN`        | At least **20** tiles within 5 of it are land (not water, not a Rift), so it always has somewhere to fire.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `GOLD_CLAIM`      | Nothing more.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `LOST_EXPEDITION` | Nothing more.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `SEA_SERPENT`     | Its **home** is Deep Water with no Fish or Pearls; every tile within 3 of home is on the board; home is **6 or more from every capital and 5 or more from every village centre**; its **area** (section 8.3) has at least **16** tiles at placement; no tile of the area is a cut tile of the eight-connected water graph (so it never closes a strait); its water component touches the landmass of every capital (the Wreck's rule 7); and home keeps **6** from every other curiosity tile, placed before or after it. |

**As built** (section 18): the Serpent's home keeps the Spider's lair
distances, **5** from every capital and **4** from every village centre
(`SEA_SERPENT_CAPITAL_DISTANCE_V7`, `SEA_SERPENT_VILLAGE_DISTANCE_V7`), not
6 and 5: with 6 and 5 almost no water board had a legal home.

The Serpent ignores rule 6 (it is not a land kind) and keeps rules 1 to 5.
Rule 5's distance 6 for the Serpent covers its reach (4 from home:
section 8.3), so a unit standing on another curiosity is never bitten.

### 3.5 Distribution (expected, measured by the beads)

Each bead extends the distribution validator
(`npm run validate:ruleset7-curiosity-maps`, seeds 0–31, every map type,
size, AI count, and both faction mixes) and its independent checker with
its kinds, and records the counts per kind, map type, and size. Expected,
not checked: on Dry Land, Pangea, and Lakes boards of width 20 a given new
land kind appears on roughly one board in seven; on Continents and
Archipelago the land kinds stay rare (rule 6, as the round-1 kinds), and
the Serpent and the Wreck share most slots, so a 20 x 20 water board meets
the Serpent on perhaps half its seeds. Hard checks: no new land kind on a
home island; no Moon Gun or Tesla Tower or Serpent below width 16; no Gold
Claim below width 14; no Serpent on Dry Land; never two dangers; every
placed curiosity accepted by the independent checker.

## 4. The Tesla Tower

**One sentence:** a unit standing on the Tesla Tower may zap an enemy
within 2 of it for 4 damage instead of attacking.

**Look:** a rusty iron lattice tower on a stone footing, a copper ball on
top crackling with white arcs; neutral rust, charcoal, and copper-brown,
the arcs white (never ice blue, the Ice Folk colour).

### 4.1 The command

`ZAP { kind, unitId, targetId }`, a **primary action**. Legality, in this
order (all rejections atomic):

| #   | Requirement                                                                                                                                                                                                  | Rejection                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                               | the ordinary unit errors                   |
| 2   | It is in land form on the `TESLA_TOWER` tile.                                                                                                                                                                | `ZAP_NOT_LEGAL { reason: "NOT_ON_TOWER" }` |
| 3   | It may use a primary action now (not acted; after its Move only if `unitMayActAfterMoveV7`; not Frozen, sluggish, or Crashed).                                                                               | the ordinary activation errors             |
| 4   | `targetId` is a unit on the board, hostile to the actor (a neutral unit included), on a tile the actor has explored, within Chebyshev **2** of the Tower; a submerged Submarine only when next to the Tower. | `ZAP_NOT_LEGAL { reason: "OUT_OF_RANGE" }` |

Any role may zap: a healer or other support unit, a flyer, a giant, a
construct, a growing dinosaur, a mind-controlled unit (for its
controller), a bound daemon. An Egg never acts; a neutral unit never
commands. A burrowed unit is off the board and is never a target.

### 4.2 The effect

- The target takes `TESLA_ZAP_DAMAGE_V7` = **4** damage: fixed, not an
  `ATTACK` (no Gang Up, Inspired, Charge, cover, or fortification), and
  **never answered** (no retaliation). The ordinary damage modifiers of
  the target still apply in their usual order: a Martian Shield absorbs it
  first; Armoured (the Ankylosaurus, the Dwarf ships) takes 3; Plated caps
  at 4; an Ice Folk unit in its own Witch's Blizzard halves it when the
  Tower is 2 away (a hit from distance 2).
- **Kill credit** goes to the zapping unit, as for a ranged attack: it
  counts the kill (Promotion, growth, Slayer), its owner gets Plunder, the
  bounty of a neutral unit, and the score of the kill. Deaths are ordinary
  (Graves on land, a water death afloat or on ice, risings of a Bitten or
  infected victim, death blasts and their chains, the release of a dead
  Brain's controlled units). A zap provokes a neutral unit it hurts (it
  joins its `provokedBy`), like any damage.
- The unit's primary action is spent; the Tower has no cooldown of its
  own (one tile, so at most one zap per turn per Tower).
- Event `TESLA_ZAPPED { playerId, unitId, at, targetId, damage,
shieldDamage, hpAfter }`, then the death events, `PLUNDER_AWARDED`, and
  `MONSTER_BOUNTY_AWARDED`. Projected by the ordinary unit-visibility rule
  (to every viewer that sees the zapper or the target); the Coins are
  owner-only as always.

Worked examples (fixed 4): a Goblin (6) is left at 2; a Martian Grunt (8,
Shield 2) loses its Shield and 2 HP; a Skeleton or a Fighter at 4 HP dies;
a Juggernaut (40) shrugs (36); a Dwarf Ironclad takes 3.

### 4.3 The tile

The Tower is a tile marker `{ kind: "TESLA_TOWER", at }`, never claimed,
removed, or owned; units enter and stand on it normally (a Move may pass
over it); nothing happens on entering. It is never in territory (3 or more
from every centre), so nothing is built on it.

**Counterplay.** Kill or move the holder (Push, the Charge! push,
Knockback, the Tractor Beam, Mind Control, the Ram from the sea); stay 3
or more away; outrange it (a Catapult or a Battleship at 3); or
stand your own unit on it first. It zaps once per turn, so two attackers
beat one gunner.

**Why it is fun.** A tug of war over a hill: a lowly unit on the Tower is
a gun emplacement, and taking the hill is worth a fight. A unit that holds
it can Promote on zaps alone.

## 5. The Moon Gun

**One sentence:** a unit standing on the Moon Gun may be fired to any
empty land tile within 5 of it; the Gun fires once a turn.

**Look:** an enormous Victorian cannon of dark riveted iron on a stone
mount, its barrel cocked at the sky, a little smoke at the muzzle; rust,
charcoal, and dull bronze (never hazard yellow).

### 5.1 The command

`FIRE_MOON_GUN { kind, unitId, at }`, a **primary action**. Legality, in
this order (all rejections atomic):

| #   | Requirement                                                                                                                                                                                                                                                    | Rejection                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                                                                                 | the ordinary unit errors                        |
| 2   | It is in land form on the `MOON_GUN` tile.                                                                                                                                                                                                                     | `MOON_GUN_NOT_LEGAL { reason: "NOT_ON_GUN" }`   |
| 3   | It may use a primary action now (as for `ZAP`).                                                                                                                                                                                                                | the ordinary activation errors                  |
| 4   | The Gun has not fired in this player's current turn (`lastFired` is not this round and this player).                                                                                                                                                           | `MOON_GUN_NOT_LEGAL { reason: "RELOADING" }`    |
| 5   | `at` is within Chebyshev **5** of the Gun and is not the Gun's tile.                                                                                                                                                                                           | `MOON_GUN_NOT_LEGAL { reason: "OUT_OF_RANGE" }` |
| 6   | `at` is explored by the actor.                                                                                                                                                                                                                                 | `MOON_GUN_NOT_LEGAL { reason: "UNEXPLORED" }`   |
| 7   | The unit may stand on `at` in land form (`canEnterTerrainV7` with its movement mode and its owner's research: a Mountain needs Engineering unless it strides, flies, or is Mountain-born; ice yes; open water never; a Rift only a flyer).                     | `MOON_GUN_NOT_LEGAL { reason: "BLOCKED" }`      |
| 8   | `at` holds no unit, mound, Barricade, or treasure chest (`tileOccupiedV7` plus the chest test), is no settlement centre, and holds no curiosity tile marker (a gate, the Well, a camp centre, a Tower, a Claim, the Expedition, a Fountain, Shrine, or Wreck). | `MOON_GUN_NOT_LEGAL { reason: "BLOCKED" }`      |

Zones of control, territory, and distance to an enemy city do not matter:
a unit may land next to a hostile city (never on its centre). A unit may
step onto the Gun and fire in one turn when it may act after its Move.

### 5.2 The effect

- The unit is placed on `at`. It is a **placement, not a Move**, like a
  Beam Down: no zone of control, no capture, no chest, no claim, no Crumbs,
  no gate traversal, no Black Ice (which reads a step onto ice). Its
  activation is **fully spent** (moved and acted, as after a landing), so
  it cannot attack, capture, fortify, or use a special action until its
  owner's next turn.
- The Gun's `lastFired` becomes `{ round, playerId }`.
- Event `MOON_GUN_FIRED { playerId, unitId, from, to }`, then one
  `TILES_REVEALED` for the unit's sight at `to`. Projected to every viewer
  that has explored the Gun or `to`, or sees the unit.

### 5.3 The tile

A tile marker `{ kind: "MOON_GUN", at, lastFired: { round, playerId } |
null }`, never claimed, removed, or owned; units enter and stand on it
normally. A unit standing on the Gun keeps every other player from firing
it (an occupied Gun is a denied Gun).

**Counterplay.** The Gun is public and its whole landing area is shown;
the landed unit is exhausted, so its target has a full turn to answer; it
fires once a turn, so it delivers one unit, not an army; park a unit on it
to deny it.

**Why it is fun.** The commando drop: a Knight lands beside a weak city, a
healer reaches a stranded giant, a Brontosaurus sails through the air.
Situational and sometimes decisive, which the user wants.

## 6. The Gold Claim

**One sentence:** a unit that ends a Move on the Gold Claim stakes it for
its owner; the Claim pays its owner 2 Coins each turn until its 30 Coins
run out.

**Look:** a timber mine mouth in a boulder with a stake and a tipped ore
cart of gold nuggets; weathered wood, grey stone, gold only on the
nuggets (the coin colour, allowed by the class rule as amended in section
12.3).

### 6.1 Staking

- A unit **stakes** the Claim exactly when a Shrine would be claimed (spec
  section 6 as built): its own `MOVE` ends on the Claim tile having moved
  onto it, in land form. Passing over it, a placement (Push, a pull,
  Knockback, an advance, Beam Down, a Moon Gun landing, a gate exit, a
  rising, a hatch, a reward unit), and a landing (`DISEMBARK`) do not.
- It stakes only when the Claim is **not played out** and its owner is
  neither the mover's owner nor an ally of it (Cooperative mode and mission
  teams: allies never take each other's Claim).
- **Effect:** the Claim's `ownerId` becomes the mover's owner. Any unit may
  stake (any role, faction, or movement mode; a mind-controlled unit for
  its controller). The Move is still its Move; nothing else happens. Event
  `GOLD_CLAIM_STAKED { playerId, unitId, at, previousOwnerId }` after the
  Move's `UNIT_MOVED`, projected to every viewer that has explored the tile.

### 6.2 The payout

- At its owner's **Start Turn**, right after `INCOME_AWARDED`, an owned
  Claim pays `min(GOLD_CLAIM_COINS_V7, left)` Coins, with
  `GOLD_CLAIM_COINS_V7` = **2**, and `left` drops by that much; `left`
  starts at `GOLD_CLAIM_TOTAL_V7` = **30**. Event
  `GOLD_CLAIM_PAID { playerId, at, coins, left }`, owner-only like
  `INCOME_AWARDED` (the remaining `left` is public on the tile anyway).
- Nobody needs to stand on it: the stake holds until another player's unit
  stakes it.
- **Played out.** When `left` reaches 0 the Claim's owner is cleared and it
  stays on the board as scenery, never staked again.
- **Elimination.** An eliminated owner's Claim becomes unowned.

### 6.3 The tile

A tile marker `{ kind: "GOLD_CLAIM", at, ownerId: PlayerId | null, left }`.
It is never in territory, never pillaged, built on, or captured; it is not
a city and counts for no victory, achievement, or Land Baron.

**Counterplay.** Any unit flips it: a fast scout raiding the Claim each
turn denies its income; a garrison next to it (not on it) guards it; the
whole purse is 30 Coins, so ignoring it is a fair choice.

**Why it is fun.** A flag in no-man's-land that pays, so cheap raiders and
skirmishes between the capitals matter; it changes hands and its story is
told on the dock ("Player 2's · 14 left").

## 7. The Lost Expedition

**One sentence:** the first unit that ends a Move on the Lost Expedition
finds its notes: its owner's next technology costs nothing.

**Look:** an abandoned explorers' camp: a torn canvas tent, crates, a pith
helmet on a crate, a rolled map and a journal; khaki canvas, driftwood,
bone white. No people (the class rule).

### 7.1 Finding it

- The **first** unit that ends a `MOVE` on the Expedition tile having
  moved onto it, in land form, of any player, finds it (the Shrine's
  trigger; no promotion condition: any role, a growing dinosaur, a
  construct, a flyer, a mind-controlled unit for its controller).
- If its owner has **a technology it could research** (not yet owned, its
  prerequisite owned, not forbidden in the match), the Expedition becomes
  **the notes** of that player: the entry gains `foundBy: playerId`.
  Otherwise its owner gains `EXPEDITION_COINS_V7` = **10** Coins and the
  Expedition leaves the board.
- Event `EXPEDITION_FOUND { playerId, unitId, at, notes: boolean, coins }`
  after the Move's `UNIT_MOVED`, projected to every viewer that has
  explored the tile (the Coins owner-only).

### 7.2 The notes

- The finder's next `RESEARCH` whose price ([current rules section
  6.1](RULESET_7_CURRENT.md#61-research-cost)) is above 0 **costs 0**: the
  free first technology of a match does not use up the notes. The player
  chooses which technology, so the notes are worth most on a tier-3
  technology with many cities (7 to 40 Coins).
- `RESEARCH` legality reads the price as 0 while the player holds notes
  (so a player with fewer Coins than the price may research), and its event
  reports cost 0; then the entry leaves the board with
  `EXPEDITION_NOTES_USED { playerId, at }` (projected to every viewer that
  has explored the tile; which technology was researched stays as private
  as any research).
- Notes are never lost, traded, or stolen; an eliminated finder's notes
  leave the board.

### 7.3 The tile

A tile marker `{ kind: "LOST_EXPEDITION", at, foundBy: PlayerId | null }`.
After it is found, the tile is drawn as a looted camp until the notes are
used; units stand on it normally and nothing more happens there.

**Counterplay.** It is a race: it lies between the capitals, so the
nearer or faster player usually wins it; a player who loses the race
loses nothing.

**Why it is fun.** An early side quest with a reward unlike Coins: which
technology to take free is a real choice.

## 8. The Sea Serpent

**One sentence:** a Sea Serpent owned by nobody prowls its waters and,
after every round, swims up to 2 tiles to bite the weakest unit that came
next to it or hurt it.

**Look:** a huge coiled sea serpent rising from the water in three humps,
a finned head with glossy eyes; slate grey-brown scales, a bone-white
belly and fins, a little dull moss on the back; the water line cut like
the Wreck's. Never violet, signal green, or ice blue (faction colours).

### 8.1 A neutral unit afloat

Everything round 1 and round 2 say of a neutral unit (the Spider's neutral
owner, hostility to every player in both modes, immunities, death, kill
credit, fog, determinism, the owner-reader audit) holds for the Serpent,
which is a unit of `NEUTRAL_OWNER_ID_V7` with a `monsters` entry of breed
**`SEA_SERPENT`**, in **`NAVAL` form**.

### 8.2 Stats

| Breed         | Label       | Mechanical role | Form    |  HP | Attack (`attack2`) | Defense (`defense2`) | Move | Range | Abilities | Regeneration | Bounty |
| ------------- | ----------- | --------------- | ------- | --: | ------------------ | -------------------- | ---: | ----: | --------- | -----------: | -----: |
| `SEA_SERPENT` | Sea Serpent | `BATTLESHIP`    | `NAVAL` |  32 | 3.5 (7)            | 2.5 (5)              |    2 |     1 | `ATTACK`  |            4 |     15 |

- Its registration has no splash, no Ram, no Torpedo, no Submerged, no
  Board, no Sight, no cost, no technology, no advance, and the mechanic
  **`seaBeast`** (never a `BOARD` target, the naval branch's shared rule
  6). It attacks after moving.
- Constants: `SEA_SERPENT_HP_V7` 32, `SEA_SERPENT_ATTACK2_V7` 7,
  `SEA_SERPENT_DEFENSE2_V7` 5, `SEA_SERPENT_MOVE_V7` 2,
  `SEA_SERPENT_AREA_RADIUS_V7` 3, `SEA_SERPENT_REGENERATION_V7` 4,
  `SEA_SERPENT_BOUNTY_V7` 15, `SEA_SERPENT_MINIMUM_WIDTH_V7` 16,
  `SEA_SERPENT_CAPITAL_DISTANCE_V7` 6, `SEA_SERPENT_VILLAGE_DISTANCE_V7` 5,
  `SEA_SERPENT_AREA_MINIMUM_V7` 16, `SEA_SERPENT_SPACING_V7` 6.

Worked examples (engine formula, full HP, open water; "dealt / taken
back"):

| The Serpent bites                         | Result    | A unit hits the Serpent (32 HP) | Result    |
| ----------------------------------------- | --------- | ------------------------------- | --------- |
| Patrol Boat (10, Defense 2)               | 10 (sunk) | Patrol Boat ramming (Attack 3)  | 7 / 5     |
| Submarine (12)                            | 10 / 3    | Patrol Boat not ramming         | 4 / 6     |
| Battleship (25, Defense 3)                | 8 / 6     | Battleship from 2–3             | 15 / none |
| a transport (embarked Fighter, Defense 1) | 12 (sunk) | Submarine's torpedo             | 11 / none |
| Fighter on the shore (12)                 | 10 / 3    | Fighter from the shore          | 4 / 6     |
| Guard on the shore (17, Defense 3)        | 8 / 6     | Knight from the shore           | 7 / 5     |

So a lone Patrol Boat or a loaded transport that strays next to it is
lost; a Battleship trades evenly; three Battleship shots from outside its
reach (over three rounds, against its regeneration), or a Battleship, a
Submarine, and a rammer in one round, kill it.

### 8.3 Home, area, and movement

- **Home** is its placement tile; its **area** is every tile within
  Chebyshev **3** of home that is Shallow or Deep Water.
- **It may stand** on a tile of its area that is **open water** (no ice),
  3 or more from every settlement centre, with no unit (any form) on it.
- **Its move:** up to **2 steps** in its neutral turn, each to a Chebyshev
  neighbour it may stand on; it passes no unit (Bigfoot's rule). It never
  enters territory, never besieges or blockades (it never stands on a
  dock), never takes a Wreck, and never advances.
- **No zone of control** (round 1's rule); it blocks its own tile for
  every unit (a Martian or Dwarf flyer crossing water passes over it).
- **Reach:** any tile next to a tile it can reach in 0 to 2 steps: at most
  3 from where it stands and 4 from home (hence the spacing of 6).

### 8.4 Provocation, the bite, and the wander

A unit **provokes** it when, at its turn, the unit is on the board, not
neutral, and either stands **next to it** (in any form: a ship, a
transport, a land unit on the shore, a land-form unit on ice) or is in its
`provokedBy` (it hurt the Serpent since its previous turn; round 1's
recording from the damage events, including a zap, a Fire Raft's Kaboom,
a Dreadnought's death blast, a bomb, a Wail).

1. Its **candidates** are the provokers next to a tile it can reach in 0
   to 2 steps (a submerged Submarine only from next to it, which range 1
   already means).
2. It picks the **lowest HP**, ties by the lowest unit ID (a Shield does
   not count).
3. If the target is not next to it, it moves by the **fewest steps** to a
   tile next to the target, the first such tile in `(y, x)` order, by the
   first shortest path in `(y, x)` order of its steps; one `UNIT_MOVED`
   with the whole path.
4. It bites with the ordinary `ATTACK` exchange the Spider uses (damage
   both ways, retaliation when the target reaches it, kill credit,
   deaths, Graves, risings, death blasts, Plunder, the bounty, the live
   economy); it never advances or pushes.

With **no candidate** it **wanders**: stay or one step, by the Spider's
stateless draw (spec section 8.4) over its standable neighbours. A
provoker beyond its reach is listed but never a candidate (a Battleship
shelling from outside the shaded reach is safe).

### 8.5 The neutral turn

The Serpent acts in the neutral turn with the other neutral units in
unit-ID order (round 2's generalised turn). **Regeneration:** the Spider
and the Serpent regenerate after the units have acted
(`min(4, maxHp − hp)`, `MONSTER_REGENERATED`); every `provokedBy` is then
cleared. Round 2's "the Spider alone regenerates" becomes "a breed with a
regeneration above 0 regenerates".

### 8.6 What affects it

The round-1 rule: **every damage applies; no status sticks; nothing moves
it; no healing**. In detail for the sea:

| Effect                                                                                    | On the Serpent                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every navy's attacks: Ram (+1), Horned Prow run-up, torpedo, Battleship shells and splash | ordinary damage; the Ram's shove is `BLOCKED`; a torpedo is never answered (the Torpedo rule)                                                                                                                                             |
| Goblin Fire Raft Kaboom, Dreadnought death blast, Gang Up from ships beside it            | ordinary damage and modifiers                                                                                                                                                                                                             |
| Board (Humans, Dinosaurs)                                                                 | **refused** (`BOARD_NOT_LEGAL { reason: "TARGET_IMMUNE" }`: neutral and `seaBeast`)                                                                                                                                                       |
| Undead Drowned Crews, Plague Galleon's Plague                                             | **never**: it never rises as a Ghost Ship and is never plagued                                                                                                                                                                            |
| Cult Kraken Drag, Offerings to the Deep                                                   | Drag never applies (it is never moved and never makes a `MOVE`); a Cult ship's kill of it pays Offerings as a Battleship's value (8, so 4 Favour) — it pays the bounty too                                                                |
| Dinosaur Plesiosaur                                                                       | a kill grows it, as any kill                                                                                                                                                                                                              |
| Martian Shields, Tractor Beam, Mind Control                                               | Shields absorb its bites; the Tractor Beam and Mind Control never take it                                                                                                                                                                 |
| Dwarf Armoured hulls, Sea Tunnels, bombs                                                  | Armoured takes its bite at 1 less; a tunnel never surfaces on its tile (occupied); a bomb damages it and provokes it                                                                                                                      |
| Candy Rush, Pie Galleon Splat                                                             | Splat never sticks; a Rushed ship's extra step may still end next to it (and provokes)                                                                                                                                                    |
| Ice Folk: Freeze, Icebound, Black Ice, the crush, Frost Bolt, Cold Snap, Glacier cover    | **the tile under the Serpent is never freezable** (a Freeze's set skips it; it is never icebound or crushed); every other freeze effect skips it; Ice Folk damage hurts it; an Ice Folk unit on Glacier ice it bites keeps its 1.25 cover |

### 8.7 The Serpent and the frozen sea

Ice is a real tactic against it, which gives the Ice Folk (who have no
ships) their way in:

- It never stands on ice, so **ice shrinks its area**: an Ice Folk seat
  that freezes the water around it fences it in; a Serpent with no open
  water to step to stays put and still bites anyone next to it (a unit
  standing on the ice beside it provokes it like any neighbour).
- Any other faction's Crack Ice reopens its water as usual; the Serpent
  never cracks ice.
- Ice may form on its home while it is away; it then simply never returns
  there.

### 8.8 Death and bounty

As the Spider (spec section 8.7 as built): the credited player gains
`SEA_SERPENT_BOUNTY_V7` = **15** Coins through `MONSTER_BOUNTY_AWARDED`;
the killer counts the kill (Promotion, a Plesiosaur's growth, Slayer,
Plunder, score worth its bounty); a death afloat leaves no Grave and
raises nothing. No respawn; its home marker goes with it.

**Counterplay.** Sail around its shaded reach; shell it from outside the
reach with Battleships or shore artillery; bring three ships for one
round's kill; feed it a cheap decoy (the weakest provoker is bitten); the
Ice Folk fence it in with ice.

**Why it is fun.** "Here be dragons": the first sea danger, a hunt with a
plan for every navy, and a 15-Coin prize; water maps finally get their
monster.

## 9. Interactions

| Rule or faction                 | Ruling                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Curiosities off                 | `curiosities: false` (and the Showcase, missions): no new kind, no `ZAP` or `FIRE_MOON_GUN` ever offered, no Claim payout step, no Serpent; generation, entity IDs, the match PRNG, and every match are those of `7r102` (section 10.1).                                                                                                                                 |
| Cities, territory, siege        | No new curiosity is in territory or within 2 of a centre; the Serpent never stands within 2 of one. The Tower's zap reaches no centre or first ring (section 3.4); the Gun never lands on a centre; a landed unit is exhausted, so it never captures on its landing turn.                                                                                                |
| Mind Control                    | A mind-controlled unit zaps, is fired, stakes, and finds notes for its controller; Mind Control on the Tower's gunner turns the gun on its owner. The Serpent is immune. A zap that kills a Brain releases its controlled units as any death.                                                                                                                            |
| Summons and risings             | A bound daemon, a Skeleton, or a risen Zombie is an ordinary own unit: it may zap, be fired, stake, and find. A rising, a hatch, a Summon, a Raise Dead, or a reward unit is a placement and never stakes or finds. An Unbound daemon is neutral and never uses a curiosity; the Tower may zap it.                                                                       |
| Giants                          | A giant may zap, be fired (the funniest flight in the game), stake, and find. Swallow, the Goblin Toss, Break Off, and regurgitation never place a unit on a new curiosity tile (round 2's rule, extended); a Crushing Shove, Knockback, or Push may move the gunner off the Tower. A giant's Stomp, trample, or Whirl damages and provokes the Serpent like any damage. |
| Gates                           | A Moon Gun never lands on a gate (rule 8); a gate exit never stakes or finds (an arrival triggers nothing). A gate displacement never lands on a new curiosity tile (the displacement rule's "holds no gate" becomes "holds no curiosity tile marker").                                                                                                                  |
| Round-1 and round-2 curiosities | Spacing 5 (6 for the Serpent) keeps the Tower's zap off every other curiosity tile and every neutral unit's area off the Tower, the Gun, the Claim, and the Expedition. Bigfoot's habitat keeps 3 from every curiosity tile, the new ones included.                                                                                                                      |
| Human                           | A zap never advances (a Knight on the Tower stays there); a Knight fired from the Gun lands exhausted and cannot Overrun that turn. Field Defense never stands on a curiosity tile.                                                                                                                                                                                      |
| Undead                          | A zap is not a bite: it infects nobody, but a Bitten unit zapped to death rises as usual. A Serpent's victim afloat or on ice leaves no Grave.                                                                                                                                                                                                                           |
| Goblin                          | Gang Up never adds to a zap (not an `ATTACK`); Plunder pays on a zap kill; a Goblin zapped to death explodes as any death (the blast may hit the gunner when next to it).                                                                                                                                                                                                |
| Dinosaur                        | A zap kill grows the zapper; Eggs never lie near a new curiosity (Eggs lie within 1 of a centre); Charge! never pushes the Serpent.                                                                                                                                                                                                                                      |
| Martian                         | Shields absorb a zap and a bite; a Saucer may land on the Gun and be fired; Beam Down onto the Tower or Gun is a placement and does nothing until the beamed unit acts; the Tractor Beam may pull the gunner off the Tower.                                                                                                                                              |
| Ice Folk                        | Ice is ground for the Gun's landing (rule 7); a Glide onto the Claim or the Expedition is part of a `MOVE` and stakes or finds when the Move ends there; Black Ice never fires on a Gun landing; section 8.7 for the Serpent.                                                                                                                                            |
| Dwarf                           | A tunnel, rider, Assemble, or Barricade never ends on a new curiosity tile (the tunnel-tile rule's "not a gate" becomes "not a curiosity tile"); a Gyrocopter's `MOVE` stakes or finds (a `BOMB_RUN` ending there does not); Armoured and Plated reduce a zap.                                                                                                           |
| Candy                           | Crumbs never lie on a curiosity tile (existing); a Rushed unit may reach the Tower and still zap if it may act; a Crashed unit cannot zap or fire.                                                                                                                                                                                                                       |
| Cultists                        | Robed cultists use every land kind like anyone; a Sacrifice of the gunner frees the Tower; a Star-fall damages the Serpent and records nobody; Proclaim and the Cowed city do not reach curiosities.                                                                                                                                                                     |
| Naval                           | Every themed navy fights the Serpent with its ordinary attacks (section 8.6). Afloat units never zap, fire, stake, or find (all four are land); a ship may be zapped from a coastal Tower.                                                                                                                                                                               |
| Achievements and score          | Slayer counts a zap kill and a Serpent kill; Explorer counts the Gun's reveal; nothing else counts the new kinds. A Claim is not a city.                                                                                                                                                                                                                                 |

## 10. Engine impact

### 10.1 Identity and compatibility

- **Bead A** bumps to `pulp-wars-poc-7r103` and **bead B** to
  `pulp-wars-poc-7r104` (`7r102` is the Dwarf Gyrocopter, landing in
  parallel). Each appends the previous identity to `PRIOR_RULESET_7_IDS`,
  moves the browser autosave key (`pulpWars.save.v7r103.current`, then
  `…v7r104…`), and updates the identity table of current rules section 1,
  following the pattern of the last bumps (`pulp_wars-w49.43`, `7r101`).
  Earlier identities are rejected, never migrated.
- Map revision unchanged (no tile changes). The `*_CURIOSITIES`
  generation rules place the round-3 kinds; no mode reproduces the round-2
  placement with the option on.
- **Off is unchanged:** with `curiosities: false`, generation and every
  pinned match equal those of the previous identity apart from the
  identity, for every seed, size, AI count, map type, and faction mix.
  With it on, no tile differs; the curiosities, the neutral units, and
  `nextEntityId` may.

### 10.2 State

| Field                     | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GameStateV7.curiosities` | The union gains `{ kind: "TESLA_TOWER", at }`, `{ kind: "MOON_GUN", at, lastFired: { round, playerId } \| null }`, `{ kind: "GOLD_CLAIM", at, ownerId: PlayerId \| null, left }`, and `{ kind: "LOST_EXPEDITION", at, foundBy: PlayerId \| null }`. Parsing rejects the wrong terrain or width, a second entry of a kind, an owner, finder, or firer that is not a seat, `left` outside 0–30, an owner on a played-out Claim, a `lastFired` round after the current one. |
| `GameStateV7.monsters`    | `breed` gains `SEA_SERPENT`. Parsing rejects a Serpent that is not in `NAVAL` form with its breed's role and maximum HP, that stands off its standable tiles (section 8.3), on Dry Land or below width 16, more than one, or with a Spider or a camp.                                                                                                                                                                                                                    |

**No new top-level field:** the notes live on the Expedition entry, the
Claim's owner on its entry, the Gun's reload on its entry. A state with
`curiosities: false` serializes as before apart from the identity.

### 10.3 Commands, events, and reasons

- **Commands** (bead A): `ZAP` and `FIRE_MOON_GUN`, placed together after
  `JOIN_CHANT` in `COMMAND_KIND_ORDER_V7` (the precedent of the latest
  blocks); offered by the command query only to a unit that may use them.
  The kind-order pins (85 command kinds at `7r101`, plus whatever `7r102`
  adds) gain 2, and the revision-12 ordinal fixture is updated for the
  kinds that shift.
- **Events** (`DOMAIN_EVENT_KIND_ORDER_V7`, each next to its precedent):
  `TESLA_ZAPPED` (by `COMBAT_RESOLVED`), `MOON_GUN_FIRED` (by `UNIT_BEAMED`),
  `GOLD_CLAIM_STAKED` (by `SHRINE_CLAIMED`), `GOLD_CLAIM_PAID` (after
  `INCOME_AWARDED`), `EXPEDITION_FOUND` (by `SHRINE_CLAIMED`),
  `EXPEDITION_NOTES_USED` (after `TECH_RESEARCHED`). Bead B adds no event
  (the Serpent reuses the neutral turn's).
- **Reasons:** `ZAP_NOT_LEGAL` `NOT_ON_TOWER`, `OUT_OF_RANGE`;
  `MOON_GUN_NOT_LEGAL` `NOT_ON_GUN`, `RELOADING`, `OUT_OF_RANGE`,
  `UNEXPLORED`, `BLOCKED`.
- `ZAP` and `FIRE_MOON_GUN` settle city rewards and evaluate achievements
  like a `MOVE` (a landing reveal may complete Explorer).

### 10.4 Public queries and previews

- `PlayerViewV7.curiosities` lists the new markers on explored tiles with
  their public fields (the Claim's owner and `left`, the Expedition's
  finder, the Gun's `lastFired`); `PlayerViewV7.monsters` lists a visible
  Serpent with its breed.
- `previewZapV7(view, unitId)`: for a unit that may zap now, every legal
  target with `damage`, `shieldDamage`, `hpAfter`, and `kills`; `exact`
  is true (every modifier it reads is public).
- `previewMoonGunV7(view, unitId)`: `loaded`, and `targets` (every legal
  landing tile). The movement query is unchanged (a landing is a command,
  not a Move).
- `previewClaimV7` is not needed: the Move preview marks a Move target on
  a Claim the mover would stake (`stakesClaim`) and on an unfound
  Expedition (`findsExpedition`).
- `previewMonsterV7` covers the Serpent: `area` (its standable tiles as
  explored), `provokeTiles` (the tiles next to it), `reachTiles` (section
  8.3), `provokers`, `likelyTarget`, and `exact` (false when an unexplored
  tile lies within 3 of it). `monsterRetaliates` and
  `queryThreatenedTilesV7` read it like the Spider (provoke tiles).
- **Headless metrics:** `monsters.breeds` gains the Serpent; new `tesla`
  (`zaps`, `kills`), `moonGun` (`shots`), `goldClaim` (`stakes`, `paid`),
  and `expedition` (`found`, `notesUsed`) blocks.

### 10.5 Audit

The owner-reader audit (spec sections 10.5 and 18) classifies every new
call site; the fuzz contract places a Serpent next to ships of all eight
seafaring factions and an Ice Folk unit on ice, and a Tower, Gun, Claim,
and Expedition next to units of all nine factions, each played a few
rounds on hand-built boards (no whole match).

## 11. Normal AI

Every heuristic reads the public view and previews, and each runs only
when the view has the curiosity it concerns (`curiosityFactsV7` gains the
four land kinds and the Serpent), so a match without one keeps its
decisions and hashes byte for byte. Errands use the existing framework
(`planCuriosityErrandsV7` and `curiosityErrandMoveV7`); a unit with an
errand is never a sole city defender or the last capturer of a planned
capture.

| Curiosity       | Errand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Priorities (existing tiers)                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Tesla Tower     | **Hold it when there is something to zap.** When a visible hostile unit stands within 4 of a free visible Tower, the nearest own land unit within 4 route steps with no offered attack on a seat's unit, whose danger on the Tower is below its HP, walks there. A unit on the Tower stays (no routine Move) while a hostile unit is visible within 4, and `ZAP` is scored like an unanswered ranged attack (4 damage, plus the kill value and bounty when it kills) against its own attacks. | arrive 952 (above the Well), approach 725; the zap scored by the attack scorer |
| Moon Gun        | **A shortcut, like the gates.** A unit with a campaign goal takes the Gun when walking to it, firing to the legal landing tile nearest its goal, and walking on saves at least 3 turns. The landing tile must have visible danger below the unit's HP and lie on no neutral unit's provoke tiles. Never a scout, a sole defender, or a wave that forms at home.                                                                                                                               | arrive 728, fire 729 (the gate traversal tier)                                 |
| Gold Claim      | **Stake it like a chest.** The nearest own land unit within 6 route steps stakes a visible Claim that is not its seat's, not an ally's, and not played out, when its danger there is below its HP.                                                                                                                                                                                                                                                                                            | stake 1330 (the chest tier), approach 725                                      |
| Lost Expedition | **A race, like the Shrine.** The nearest own land unit within 6 route steps (any role) goes for an unfound visible Expedition. The seat's research picker is unchanged; with notes in hand it researches its ordinary next pick even when short of Coins (the command query prices it at 0).                                                                                                                                                                                                  | find 1330, approach 725                                                        |
| Sea Serpent     | **Avoid unless strong** (the Spider's rules of spec sections 11 and 33): no routine Move ends on its provoke tiles; a unit there with no attack on a seat's unit steps away; an **embarked unit's routine Move never ends in its reach tiles** (one bite sinks it); attack it only (a) in a kill plan this turn or (b) from outside its reach with more damage than its regeneration (4), by a unit with no better target. The Ice Folk follow the same avoidance on ice.                     | the Spider's (step away 1176; kill plans as the hunt plan)                     |

The new errand constants (`TESLA_ARRIVE_PRIORITY_V7` 952,
`MOON_GUN_ARRIVE_PRIORITY_V7` 728, `MOON_GUN_FIRE_PRIORITY_V7` 729,
`CLAIM_ERRAND_STEPS_V7` 6, `EXPEDITION_ERRAND_STEPS_V7` 6,
`TESLA_ERRAND_STEPS_V7` 4, `TESLA_WATCH_RADIUS_V7` 4) and the policy's
copies of the engine numbers (the zap's 4, the Serpent's regeneration 4
and bounty 15 in `NEUTRAL_BOUNTY_FOR_POLICY_V7`) are pinned to the engine
by the round-3 AI tests. `docs/architecture/NORMAL_AI.md` gains a "Map
curiosities, round 3" section from each bead.

## 12. UI, art, and sound

### 12.1 Interface per curiosity

| Curiosity       | Board                                                                                                                                       | Dock and "?"                                                                                                            | Commands and previews                                                                                                                                                                                                      | Toasts and log                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tesla Tower     | 80 px overlay; selecting it outlines its zap range (radius 2)                                                                               | tile dock: "Tesla Tower · Stand a unit on it to zap an enemy within 2 for 4."                                           | **Zap** in the unit's actions while legal; board targeting: the range outlined, every legal target marked with its damage ("−4", "kills"); click a target, confirm as for an attack                                        | arc effect from the Tower to the target; log "Your Fighter zapped Player 2's Goblin (−4)"                              |
| Moon Gun        | 80 px overlay; selecting it outlines the landing radius 5                                                                                   | "Moon Gun · Loaded" or "Reloading"; "Stand a unit on it to fire it up to 5 tiles."                                      | **Fire** in the unit's actions while legal; board targeting: legal landing tiles highlighted, danger tiles carry the threat marker; the unit flies in an arc                                                               | muzzle blast and landing puff; log "Your Knight was fired from the Moon Gun"                                           |
| Gold Claim      | 80 px overlay with a code-drawn pennant in the owner's colour; greyed when played out                                                       | "Gold Claim · Yours · 18 Coins left", "Player 2's · …", "Unclaimed · 30 Coins left", "Played out"                       | a Move target that would stake it is labelled "Stake"                                                                                                                                                                      | toast "Gold Claim staked"; "+2 Coins (Gold Claim)" in the income line; log lines for stakes by others                  |
| Lost Expedition | 80 px overlay; a looted look (code-dimmed, the journal gone) once found                                                                     | "Lost Expedition · The first to arrive gets a free technology." / "Notes taken by Player 2."                            | a Move target that would find it is labelled "Find"; the technology panel shows **Free** on every technology while the viewer holds notes                                                                                  | toast "Expedition notes: your next technology is free" (or "+10 Coins"); log line for others                           |
| Sea Serpent     | giant unit sprite on its lair marker (home), no owner colour, neutral base; selecting it outlines its area as explored and shades its reach | chips "Neutral" and "Provoked"; "?" dialog: HP, Attack, Defense, Move 2, "Regenerates 4", "Bounty 15", the one sentence | a Move target next to it carries the provoked marker, cursor text "Ends next to the Sea Serpent: it will bite after this round."; attack preview "The serpent will strike back next round" or "Out of the serpent's reach" | neutral-turn playback ("The wilds stir"); log "Sea Serpent bit your Battleship", "Sea Serpent slain: +15 Coins bounty" |

**Shared:** the five one-sentence rules join `CURIOSITY_RULES_V7` and
`curiosityHelpRulesV7` (the cursor descriptions and the Gallery); Help
stays short (`pulp_wars-2yc.39`); the Gallery's Curiosities tab gains a
third row of five; the setup hint becomes "Rare sights on the map:
monsters, camps, gates, a sea serpent, and more." LEGACY and the Classic
look draw code markers first (a lattice tower with a spark, a cannon
barrel, a pick and pan, a tent, and a neutral disc with a wave for the
Serpent), so the rules are playable before the art. Every effect has its
reduced-motion form.

### 12.2 Art (PixelLab, chibi direction, curiosity class)

| Asset                                                                          | Kind                           | Brief                                                                                    | Bead |
| ------------------------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------- | ---- |
| `CURIOSITY:TESLA_TOWER`                                                        | 80 x 80 overlay, Grass/Forest  | rusty lattice tower, copper ball, white arcs                                             | A    |
| `CURIOSITY:MOON_GUN`                                                           | 80 x 80 overlay, Grass         | huge riveted iron cannon on a stone mount, barrel to the sky, a wisp of smoke            | A    |
| `CURIOSITY:GOLD_CLAIM`                                                         | 80 x 80 overlay, Grass/Forest  | timber mine mouth in a boulder, a stake, a tipped cart of gold nuggets                   | A    |
| `CURIOSITY:LOST_EXPEDITION`                                                    | 80 x 80 overlay, Grass/Forest  | torn khaki tent, crates, a pith helmet, a rolled map, a journal                          | A    |
| `UNIT:NEUTRAL_SEA_SERPENT` and `PORTRAIT:NEUTRAL_SEA_SERPENT`                  | giant unit (88 wide), portrait | three humps and a finned head above a cut water line; slate grey-brown, bone-white belly | B    |
| `CURIOSITY:SERPENT_LAIR`                                                       | 80 x 80 overlay on water       | a ring of barnacled rocks awash, a few bones; reads under the Serpent                    | B    |
| `ICON:CURIOSITY:{TESLA_TOWER,MOON_GUN,GOLD_CLAIM,LOST_EXPEDITION,SEA_SERPENT}` | 48 x 48 icons                  | the subjects, for the dock, legend, and Gallery                                          | A, B |
| `EFFECT:{TESLA_ARC,MOON_GUN_BLAST,EXPEDITION_NOTES}`                           | 48 x 48 effects                | a white zig-zag arc, a smoke-and-flash ring, a journal with sparkles                     | A    |

### 12.3 The class document

`docs/art/classes/curiosities.md` gains a round-3 section: the briefs
above, the accepted recipes, and one amendment of rule 2: **gold is also
allowed on the Gold Claim's nuggets** (the coin colour). The Tesla arcs
are white, the Moon Gun's metal is dark iron and dull bronze (never
hazard yellow), and the Serpent avoids violet, signal green, and ice blue.
Every master is measured against the faction colours by
`npm run art:curiosities-review`.

### 12.4 Sound

| Moment                   | Cue                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Zap                      | **new** `special.zap` (an electric crackle), generated with `scripts/audio/elevenlabs-sfx.ts`     |
| Moon Gun fired / landing | `attack.cannon` / `impact.heavy`                                                                  |
| Claim staked / paid      | `economy.treasure` / `economy.coin`                                                               |
| Expedition found         | `economy.treasure` then `special.sparkle`                                                         |
| Serpent bites            | **new** `attack.serpent` (a hiss and a splash), ElevenLabs; its hurt sound is `unit.hurt.monster` |

The two new clips are measured with `measure --only <id>`, kept short and
compressed, and added to the sound gallery; raw takes stay outside the
repository.

## 13. Test plan (no simulations)

Every test is a small hand-built state or a single generated board; no
test plays a match (the user's standing rule). Fixtures:
`tests/fixtures/v7-round3-arena.ts`.

- **Generation:** the option off reproduces the previous identity for
  seeds 0–31 of every size, AI count, type, and faction mix; the option on
  changes no tile; the stream order (the replay of the round-2 test,
  extended to fourteen kinds and the new count table) on pinned seeds; the
  hard checks of section 3.5 by the independent checker; the Serpent's
  spacing of 6 both ways; the danger exclusion with the Serpent.
- **Tesla Tower:** each legality row; the 4 with Shield, Armoured, Plated,
  and the Blizzard; no retaliation; kill credit (Promotion, growth,
  Plunder, bounty); a submerged Submarine only beside the Tower; a zap
  provoking a neutral unit; events and projection.
- **Moon Gun:** each legality row and reason; the landing's ignored ZOC,
  chest, claim, Black Ice; the exhausted activation; once per player-turn
  and the next player's reload; Mountain and ice landings; projection.
- **Gold Claim:** staking by `MOVE` only (each non-trigger), allies
  refused, the payout order after income, played out at 0, elimination,
  owner-only payout events.
- **Lost Expedition:** the first finder only; notes versus 10 Coins; the
  free first technology not using the notes; `RESEARCH` legal with fewer
  Coins than the price; removal and events; an eliminated finder.
- **Sea Serpent:** standable tiles (open water, area, centres); the two-
  step move without passing units; candidates and the step choice; wander;
  regeneration; every row of section 8.6, one test per immunity; the frozen
  sea rows of section 8.7; the bounty and Offerings; parsing.
- **AI:** each errand of section 11 on a small state, its gating (no
  curiosity: identical decisions), the embarked avoidance of the Serpent's
  reach.
- **UI:** presentation and render tests per kind in the live look and
  LEGACY; DOM tests for Zap and Fire targeting on hand-built boards; the
  Gallery row; the review script of each bead.
- **Saves:** round trips with every new kind mid-match; hashes stable.

## 14. Acceptance criteria (both beads)

1. With `curiosities: false`, generation and every match of the previous
   identity are reproduced (identity aside); with `true`, no tile differs.
2. Every placed curiosity obeys section 3; no exclusion is ever broken;
   the counts follow section 3.2 within the skips legal sites force.
3. Every rule of sections 4 to 9 is implemented and tested with exact
   public previews.
4. The owner-reader audit and the fuzz contract cover the new call sites
   and the Serpent.
5. The Normal AI uses or avoids each kind as section 11 says; a view
   without them decides as before.
6. The board, docks, "?" dialogs, commands with board targeting, toasts,
   Gallery, art (or the LEGACY markers), and sounds are live on phone and
   desktop.
7. The distribution of each kind is measured and recorded in the bead.

## 15. Implementation beads

Two beads, each engine, Normal AI, interface, art, sound, and the fold of
its kinds into [current rules section 2.7](RULESET_7_CURRENT.md#27-map-curiosities)
(a "Round 3" subsection) and the identity table. Bead A lands first; bead
B builds on it.

### 15.1 Bead A: the four land curiosities (`pulp-wars-poc-7r103`)

**Title:** "Curiosities round 3, A: Tesla Tower, Moon Gun, Gold Claim, Lost
Expedition (engine, AI, UI, art; 7r103)". Depends on `pulp_wars-737.19`
and on the `7r102` Gyrocopter bead (identity order).

**Scope:** sections 3 (kinds 10–13, the count table of 3.2, the checker
and validator), 4 to 7, the rows of section 9 for these kinds, 10 (state,
`ZAP` and `FIRE_MOON_GUN`, events, reasons, previews, metrics, audit),
11 (four errands), 12 (UI, art, `special.zap`), 13.

**Acceptance:**

1. Generation places the four kinds per sections 3.1 to 3.4 and the new
   count table; `npm run validate:ruleset7-curiosity-maps` PASS with the
   new hard checks; the measured counts recorded in the bead and in a
   notes section of this document.
2. Option off byte-identical to `7r102`; option on changes no tile.
3. `ZAP` and `FIRE_MOON_GUN`: every legality row, effect, event, and
   projection tested; previews exact; commands offered only when legal.
4. Gold Claim staking and payout, Lost Expedition notes and the free
   research, tested per section 13.
5. Normal AI errands of section 11 for the four kinds, gated, tested on
   small states; priorities pinned.
6. UI per section 12.1 (LEGACY markers and the art), board targeting for
   Zap and Fire, dock texts, Gallery row, toasts, log; DOM and render
   tests; `npm run review:ruleset7-curiosities-round3-ui` (new, on
   hand-built boards, no AI turn) with its screenshots inspected.
7. Art: the four overlays, four icons, three effects, generated through
   the checked-in curiosity batch recipes, each inspected at native and
   enlarged size; `npm run art:validate` and
   `npm run art:curiosities-review` PASS; the class document updated.
8. `special.zap` generated through the ElevenLabs script and in the sound
   gallery.
9. Identity `7r103` with the prior list, autosave key, kind-order pins,
   and identity table; current rules section 2.7 gains the round-3
   subsection for these kinds.

### 15.2 Bead B: the Sea Serpent (`pulp-wars-poc-7r104`)

**Title:** "Curiosities round 3, B: the Sea Serpent (engine, AI, UI, art;
7r104)". Depends on bead A.

**Scope:** sections 3 (kind 14, its site rules, spacing 6, the danger
set), 8, the naval and ice rows of section 9, 10 (the breed, parsing,
`previewMonsterV7`, metrics, audit and fuzz), 11 (the Serpent row), 12
(sprite, portrait, lair, icon, `attack.serpent`), 13.

**Acceptance:**

1. Generation places the Serpent per section 3.4 (never on Dry Land or
   below width 16, never with another danger, 6 from every other
   curiosity); validator PASS; counts recorded.
2. Option off byte-identical to `7r103`; option on changes no tile.
3. The Serpent's movement, provocation, bite, wander, regeneration,
   bounty, and every row of sections 8.6 and 8.7 tested on hand-built
   boards, with each themed navy (Human, Undead, Goblin, Dinosaur, Martian,
   Dwarf, Candy, Cult ships) and Ice Folk ice.
4. `previewMonsterV7`, `monsterRetaliates`, and the threatened tiles exact
   for it; parsing rejects every bad Serpent state.
5. Normal AI avoidance (embarked units out of its reach), kill plans, and
   ranged chip, gated and tested.
6. UI per section 12.1, Gallery, LEGACY marker; DOM, render, and review
   screenshots inspected.
7. Art: sprite, portrait, lair, and icon accepted under the class rules;
   `npm run art:validate` and `npm run art:curiosities-review` PASS.
8. `attack.serpent` generated and in the sound gallery.
9. Identity `7r104`; current rules section 2.7 round-3 subsection
   completed.

### 15.3 Validation profile (both beads)

```text
Validation profile: ai/map/persistence (no simulations) plus the asset gates
Worker focused checks: npx vitest run tests/unit/ruleset-v7-curiosities-round3*.test.ts tests/unit/ruleset-v7-curiosities-round3-ai.test.ts tests/unit/ruleset7-curiosities-round3-*.test.ts tests/integration/ruleset7-curiosities-round3-dom.test.ts tests/unit/chibi-curiosities-assets.test.ts tests/unit/ruleset-v7-curiosities-round2-generation.test.ts tests/unit/ruleset-v7-curiosities.test.ts tests/unit/ruleset-v7-curiosity-generation.test.ts; npm run validate:ruleset7-curiosity-maps (generation only, no match); npm run art:validate; npm run art:curiosities-review; npm run typecheck; npm run lint
Conditional final gates: npm run format:check, npm run lint, npm run typecheck, npm run test:unit, npm run build, npm run art:validate, npm test -- tests/unit/*assets*.test.ts, npm run art:curiosities-review (always); npm run test:sim, npm run validate:ruleset7-release, npm run smoke:browser only when the user authorises simulations (skip recorded in the bead)
```

### 15.4 Map-generation pins and the "off" guarantee

**The guarantee.** Placement runs only with the option on, after the
chests and the Rifts, on its own stream; it never changes a tile, rejects
a board, or draws from the match stream; the new kinds add no top-level
state field. So every setup with `curiosities: false` (every parity,
balance, and release tool, the release corpus, missions, and the
Showcase) is unchanged, and the release validator's `curiosities: false`
baseline needs no new expectations.

**What moves with the option on.** The new count draw (widths 20 and 25)
and the wider kind draw change which curiosities a seed gets, so these
pins move and each bead re-pins them (re-finding a seed that draws the
kind a test needs, as round 2 did):

- `tests/unit/ruleset-v7-curiosities-round2-generation.test.ts`: the
  stream-order replay (extend it to fourteen kinds and the count table),
  the four pinned seeds (Pangea 20 seeds 0, 30, 1; Dry Land 25 seed 17),
  the Graveyard seed (Pangea 20 seed 1), and the gates seed (Dry Land 25
  seed 17).
- `tests/unit/ruleset-v7-curiosities.test.ts` (the Shrine round trip seed
  17, the count draw over seeds 0–299) and
  `tests/unit/ruleset-v7-curiosity-generation.test.ts`.
- `tests/unit/ruleset-v7-curiosities-round2.test.ts` (seed loops that look
  for a kind).
- The unit tests that generate a board with the option on and pin what it
  holds: `ruleset-v7-map-scale`, `ruleset-v7-village-spread`,
  `ruleset-v7-many-seats`, `ruleset-v7-ai-head-start`, `game-kind-v7`,
  `skirmish-stars-v7`, `analytics-v7`, `perf-memo-v7`,
  `multitile-fog-render-v7`, `city-names-presentation-v7`,
  `ruleset-v7-frozen-sea-interactions`, and
  `tests/integration/ruleset7-quick-start-dom.test.ts` (each checked; most
  only strip the curiosities and stay green).
- **Simulation pins, not run** (the user's rule): the Spider headless
  matches (Pangea seed 150, Dry Land seed 7) in
  `ruleset-v7-monster-headless.sim.test.ts`, the browser test on Dry Land
  16 seed 8 in `ruleset7-curiosities-dom.sim.test.ts`, and the curiosity
  matches of `ruleset-v7-curiosities.sim.test.ts`,
  `ruleset-v7-curiosities-ai.sim.test.ts`, and
  `ruleset-v7-monster.sim.test.ts`. Each bead lists which of these seeds
  still draw their kind (a generation-only check) and leaves the match
  pins for the next authorised simulation run.

## 16. Decisions made, and the taste calls for the user

Every decision below is made; the first four most deserve the user's eye.

1. **More curiosities on big boards** (section 3.2): 20 x 20 always gets
   2, 25 x 25 gets 2 or 3. Without it each kind would be about a third
   rarer than now. Alternative: keep the old counts.
2. **The Moon Gun may land next to an enemy city** (only its centre is
   forbidden), a deliberate commando drop. Alternative: forbid hostile
   territory.
3. **The Sea Serpent sinks a Patrol Boat or a loaded transport in one
   bite** (Attack 3.5). Alternative: Attack 3 (8 to a Patrol Boat, 10 to a
   transport).
4. **The Gold Claim pays 2 Coins a turn up to 30** and needs no garrison.
   Alternative: 1 a turn, or pay only while a unit stands on it.
5. **The Lost Expedition gives a free technology of the finder's choice**
   (notes) rather than Coins.
6. **The Tesla Tower is dormant when nobody holds it** (not a hazard),
   and its zap is a chosen command, not an automatic shot.
7. **Names:** Tesla Tower, Moon Gun, Gold Claim (not "Gold Mine", which
   would clash with the Mine building), Lost Expedition, Sea Serpent.
8. **The Serpent counts as the board's one danger**, so a board never has
   both a Serpent and a Spider or camp.

Tuning bounds for a later coarse check: zap 3–5 and radius 2–3; Gun range
4–6; Claim 1–3 a turn and 20–40 in all; Expedition fallback 6–12 Coins;
Serpent HP 26–36, Attack 3–4, regeneration 2–4, bounty 10–18, area radius
2–3; every new weight 1–3; the count table by at most one step per size.

## 17. Implementation notes, bead A (`pulp_wars-737.20`)

Built at `pulp-wars-poc-7r103`, chained after the Gyrocopter pass's
`7r102`. The rules of sections 3 to 7 are in
[current rules section 2.7, round 3](RULESET_7_CURRENT.md#round-3-the-tesla-tower-the-moon-gun-the-gold-claim-and-the-lost-expedition);
the AI in
[Normal AI, round 3](../architecture/NORMAL_AI.md#map-curiosities-round-3-pulp_wars-73720);
the targeting in
[board targeting section 3.10](../ui/BOARD_TARGETING.md#310-map-curiosities-round-3-bead-pulp_wars-73720);
the art in
[the curiosity class, section 9](../art/classes/curiosities.md#9-round-3-pulp_wars-73720).
No game was played or simulated.

**Choices the design left open.**

- `ZAP` names its target `targetUnitId` (the field of every other
  unit-targeted command), not `targetId`; `TESLA_ZAPPED` carries
  `targetUnitId` and `targetAt`.
- The zap's fixed hit goes through the giants' `resolveFixedHitsV7` with
  cause `ATTACK`, so kill credit, Plunder, the bounty, growth, and the
  grave tail are those of an attack, and a neutral unit it hurts is
  provoked.
- The Moon Gun's landing rejection is one function
  (`moonGunLandingRejectionV7`) shared by the reducer and the public query,
  so on a visible board the offered landings are exactly the accepted
  ones; a landing on a unit hidden in fog is offered by the view and
  refused `BLOCKED` by the reducer, as a Beam Down tile is.
- The Moon Gun's 20-land rule counts land tiles within 5 that are not
  water and not a Rift (`MOON_GUN_LAND_MINIMUM_V7`).
- A played-out Claim keeps `left` 0 and no owner; at most one marker of
  each new kind is parsed.
- The Normal AI's Gold Claim and Lost Expedition errands use the round-1
  claim priority (1330, the chest tier); the Tesla Tower's holder makes no
  routine Move while the watch radius has a hostile unit.

**Interface review.** The first review pass found the Knight on the Gun
showing one generic "Fire" button per landing (105) and the Tower's
holder three "Zap" buttons: `ZAP` and `FIRE_MOON_GUN` joined the
commands that are never generic buttons (a DOM test pins one button
each). It also replaced the Moon Gun's "In enemy reach" label boxes by the
threat marker (section 3.10 of board targeting).

**Measured distribution** (`npm run validate:ruleset7-curiosity-maps`,
seeds 0 to 31, every map type, size, AI count, and both faction mixes:
3840 boards, `PASS`). Boards with 0 / 1 / 2 / 3 curiosities, and the
boards with each new kind (Tesla Tower, Moon Gun, Gold Claim, Lost
Expedition), by map type and width:

| Map type    | Width | Boards | 0 / 1 / 2 / 3    | Tower | Gun | Claim | Expedition |
| ----------- | ----: | -----: | ---------------- | ----: | --: | ----: | ---------: |
| Dry Land    |    14 |    128 | 60 / 68 / 0 / 0  |     0 |   0 |    14 |         12 |
| Dry Land    |    16 |    192 | 48 / 144 / 0 / 0 |    22 |   8 |    19 |         19 |
| Dry Land    |    20 |    192 | 2 / 102 / 88 / 0 |    21 |  24 |    48 |         36 |
| Dry Land    |    25 |    192 | 0 / 53 / 82 / 57 |    39 |  47 |    37 |         42 |
| Pangea      |    20 |    192 | 4 / 76 / 112 / 0 |    25 |  24 |    50 |         35 |
| Pangea      |    25 |    192 | 2 / 69 / 66 / 55 |    32 |  46 |    39 |         46 |
| Lakes       |    20 |    192 | 8 / 95 / 89 / 0  |    20 |  21 |    31 |         31 |
| Lakes       |    25 |    192 | 0 / 65 / 71 / 56 |    36 |  40 |    34 |         42 |
| Continents  |    20 |    192 | 2 / 96 / 94 / 0  |     6 |   2 |    34 |         36 |
| Continents  |    25 |    192 | 0 / 76 / 96 / 20 |     4 |  14 |    26 |         28 |
| Archipelago |    20 |    192 | 0 / 152 / 40 / 0 |     6 |   0 |    12 |         10 |
| Archipelago |    25 |    192 | 0 / 154 / 34 / 4 |     2 |   2 |    12 |          6 |

Totals over the 3840 boards: Tesla Tower 246, Moon Gun 253, Gold Claim
452, Lost Expedition 421 (the Wreck 1296, the Fountain 524). On widths 20
and 25 the count is a target, not a guarantee: when no eligible site is
left a slot stays empty (no board is ever rejected), which is why many
20 x 20 boards still have one. On Dry Land, Pangea, and Lakes boards of
width 20 a given new kind is on one board in four (the Claim) to one in
ten (the Tower on Lakes), against the design's "one in seven"; on Continents and Archipelago the Tower and the Gun are
rare (rule 6 and the Gun's 20 land tiles), as expected.

**Pins.** The unit-tier generation pins moved as section 15.4 says and
were re-pinned: the round-2 generation streams (Pangea 20 seeds 9, 15, and
5; Dry Land 25 seed 12; the Graveyard seed 5; the gates seed 12; were 0,
30, 1, and 17), the count-draw table (width 20 always 2; width 25 3 on
about half), the generation test's "at most 3 on 25", and the disruption
paths. Command and event kind counts and positions (`ZAP` and
`FIRE_MOON_GUN` after `JOIN_CHANT`, 87 commands; 160 events), the
revision-12 ordinal table, the AI decision hashes whose tie-break tuples
hold command ordinals (each re-pinned only where its revision-12-ordinal
twin stayed equal), the recorded no-Ice-Folk decisions (only the ordinal
of kinds after `JOIN_CHANT` moved, by two), the reader classifications,
and the form audit were updated. The simulation tier was not run (the
user's rule). Expected to move there: every simulation with curiosities
on (`ruleset-v7-curiosities.sim`, `ruleset-v7-monster.sim`,
`ruleset-v7-monster-headless.sim`, `ruleset7-curiosities-dom.sim`,
`ruleset-v7-tuning-7.sim`, `ruleset-v7-tuning-8.sim`: the new kinds join
the draw on 14 and 16 too), and any simulation that hashes Normal AI
decision tuples (the command ordinals after `JOIN_CHANT` moved by two).
With curiosities off, boards are those of the generator without
curiosities and no Zap or shot is offered
(`tests/unit/ruleset-v7-curiosities-round3-generation.test.ts`, "the
option off"), the `7r34` initial-state pins of
`tests/unit/ruleset-v7-curiosities.test.ts` hold, and the Normal AI
decides as before on a board without a round-3 curiosity
(`tests/unit/ruleset-v7-curiosities-round3-ai.test.ts`).

**Notes for bead B (the Sea Serpent).** Append `SEA_SERPENT` to the
placement kinds after `LOST_EXPEDITION` and to
`CURIOSITY_DANGER_KINDS_V7`; the count table already gives 20 and 25 their
new counts. The setup hint ("Rare sights on the map: monsters, camps,
gates, a moon gun, and more.") may name the Serpent; the Gallery's third
curiosity row has a free fifth cell (its row separator stops at the fourth
column until then); the support effects and `sound-events-v7.ts` take a
`attack.serpent` cue the way `special.zap` was added; the identity is
`7r104` with the same bump steps. The Serpent is a neutral unit, so it
needs no `CuriosityV7` marker.

## 18. Implementation notes, bead B (`pulp_wars-737.21`)

Built at `pulp-wars-poc-7r104`, after bead A's `7r103`. The rules are in
[current rules section 2.7, round 3 B](RULESET_7_CURRENT.md#round-3-b-the-sea-serpent);
the AI in
[Normal AI, round 3 B](../architecture/NORMAL_AI.md#map-curiosities-round-3-b-the-sea-serpent-pulp_wars-73721);
the art in
[the curiosity class, section 10](../art/classes/curiosities.md#10-round-3-b-the-sea-serpent-pulp_wars-73721).
No game was played or simulated.

**Choices the design left open, and one change.**

- **The home's distances are the lair's, 5 and 4** (section 3.4 asked for
  6 and 5). Measured on the validator's boards before the change, 6 and 5
  left **no** legal home on any Lakes board and on all but one of eight
  Continents boards of widths 20 and 25 (the village-density counts put a
  village within 4 of almost every deep tile, as they did for the Spider
  before `pulp_wars-ykw.7` lowered its village distance to 4). The Serpent
  still never stands within 2 of a centre, so it never bites a unit on a
  centre; the spacing of 6 to every other curiosity is kept. The constants
  keep their names; one line each brings 6 and 5 back.
- **Offerings.** Section 8.6 says a Cult ship's kill pays Offerings "as a
  Battleship's value (8, so 4 Favour)"; a Battleship's value is its cost,
  16, which would pay 8. The explicit numbers were kept: the Serpent is a
  victim of value `SEA_SERPENT_OFFERING_VALUE_V7` = 8 (4 Favour).
- The Serpent is created in `NAVAL` form (the only neutral unit afloat;
  parsing pins the form by breed). Its move is a breadth-first search over
  its standable tiles in (y, x) order, so the path to each tile is the
  first shortest path in (y, x) order of its steps; a bite's `UNIT_MOVED`
  carries the whole path.
- Nothing moves it because it is neutral: the Ram's shove gained the
  neutral check (`ramShoveDestinationV7` and the public preview), as
  Knockback and Push had.
- A neutral attacker never drowns into a Ghost Ship either
  (`attackerDrowns` now checks `unitTakesStatusV7`, as `defenderDrowns`
  did), so a Serpent killed by an Undead ship's answer to its bite sinks.
- The Freeze set reads `neutral` on the occupant of a tile: a neutral
  unit's tile is never taken (the line stops there), so the Serpent is
  never icebound or crushed. No other ice effect needed a change (every
  status already skipped neutral units).
- The lair is drawn as the overlay `SERPENT_LAIR` under the Serpent at its
  home (like the Spider's web), and its legend icon is the Serpent's.
- The Normal AI: ships join the kill plan for the Serpent only, and the
  naval plan's fleet facts leave neutral ships out (section 11).

**Measured distribution** (`npm run validate:ruleset7-curiosity-maps`,
seeds 0 to 31, every map type, size, AI count, and both faction mixes:
3840 boards, `PASS`). Boards with a Sea Serpent, by map type and width
(192 boards a row; none below 16, none on Dry Land):

| Map type    |  16 |  20 |  25 |
| ----------- | --: | --: | --: |
| Archipelago |  40 | 112 | 154 |
| Continents  |  14 |  42 |  52 |
| Lakes       |   4 |   8 |  12 |
| Pangea      |   0 |   0 |   1 |
| Dry Land    |   0 |   0 |   0 |

Totals: the Sea Serpent 439 (the Wreck 1122, which shares its water; the
Spider 257, the Fountain 503, the Tesla Tower 265, the Moon Gun 255, the
Gold Claim 455, the Lost Expedition 403). An Archipelago of width 20 meets
it on 58% of its seeds (the design guessed about half of the water boards
of width 20), a Continents board on 22%; Lakes and Pangea rarely have
deep water 3 tiles from the edge with 16 water tiles around it.

**Pins.** The unit tier moved only where the new breed, kind, sound, or
cell is listed: the breed tables and orders (`ruleset-v7-curiosities-round2`,
`ruleset-v7-cult-unbound`, `ruleset-v7-cult-tricks`), the land-arena breed
loops that now skip the Serpent (`ruleset-v7-curiosities-round2`,
`ruleset-v7-ice-folk-freeze`; it is proved on a sea), the kind and danger
lists (`ruleset-v7-curiosities-round3-generation`), the Help icons, the
Gallery's cells, the sound lists and the synth table, the unit-reader
classes (`previewSeaSerpentV7`), and the identity pins (`7r104`). No
generation seed pin of the unit tier moved (none of their seeds has a
legal Serpent home), and no AI decision hash moved (no command or event
kind was added). **Simulation pins, not run** (the user's rule), expected
to move: every simulation with curiosities on whose board is a
Continents, Archipelago, Lakes, or Pangea board of width 16 or more (the
Serpent joins the draw there), so `ruleset-v7-curiosities.sim`,
`ruleset-v7-curiosities-ai.sim`, `ruleset-v7-monster.sim`,
`ruleset-v7-monster-headless.sim`, `ruleset7-curiosities-dom.sim`, and
`ruleset-v7-tuning-7.sim` and `ruleset-v7-tuning-8.sim` where they use
such boards; Dry Land boards and every match with curiosities off are as
at `7r103`. The monster fuzz contract (`ruleset-v7-monster-fuzz.sim`) was
not extended; the Serpent's immunities against every navy and the ice are
proved on hand-built seas in
`tests/unit/ruleset-v7-curiosities-round3-serpent.test.ts`.

**Tests.** `tests/unit/ruleset-v7-curiosities-round3-serpent.test.ts`
(registration, standable tiles, the two-step reach, the wander, the bite,
the swim, regeneration, provocation from range, a shore unit, every row of
section 8.6 with each themed navy, the frozen sea, the bounty, the
preview, parsing),
`tests/unit/ruleset-v7-curiosities-round3-serpent-generation.test.ts`
(the kind, its boards and sites, the spacing both ways, the stream on
three pinned seeds, the created unit, the option off),
`tests/unit/ruleset-v7-curiosities-round3-serpent-ai.test.ts` (section
11), `tests/unit/ruleset7-curiosities-serpent-render.test.ts` (words,
board, canvas, Gallery, sound), and the Serpent block of
`tests/unit/chibi-curiosities-assets.test.ts`; the hand-built boards are
`tests/fixtures/v7-serpent-arena.ts` and
`tests/fixtures/v7-curiosities-serpent-ui.ts`.

## Appendix A. Ideas weighed and rejected

- **A Mist** (no shooting into or out of a 3 x 3 fog): a real tactical
  zone, but it needs an audit of every ranged ability (bombs, rays,
  spells) for one rule players would forget; the Tower gives the "hold
  this ground" story with one command.
- **A Maelstrom** at sea (pulls and flings ships): unreadable (where does a
  ship end up?) and another teleport after the gates.
- **A Giant Clam** (hold a ship on it three turns for Coins): a slow,
  quiet objective; the Serpent is the sea's story, and the Claim already
  covers "hold for Coins" on land.
- **A Golden Idol to carry home** (capture the flag): great pulp, but a
  carried object needs a rule for every way a unit leaves the board
  (death, Swallow, Sacrifice, Mind Control, Disband, embarking, tunnels).
- **A Lighthouse or Watchtower** (sight): fog only ever grows and every
  explored tile shows its units, so extra sight is worth little (round 1's
  verdict on standing stones).
- **An Old Dojo** (a kill toward Promotion each turn): overlaps the Shrine.
- **A Volcano** (timed eruptions): a hazard everyone simply avoids; no
  decision.
- **An automatic Tesla Tower** (zaps the weakest enemy by itself): fewer
  clicks, but no target choice, which the board-targeting rule prefers.
