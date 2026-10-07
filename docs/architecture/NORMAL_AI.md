# Greedy Normal AI

## The Undead pass (`pulp_wars-w49.13`)

**[The Undead faction pass](../product/RULESET_7_TUNING_UNDEAD.md#8-the-normal-ai)**
(`pulp-wars-poc-7r51`) changed three Undead unit rules: the Skeleton has
Bones (Defense 3 against an attack from two or more tiles), the Vampire
has Escape, and the Abomination has Infect. What the policy does with the
roster, in `src/ai/v7-army.ts` and `src/ai/v7.ts`. Every rule below is an
Undead seat's (or an Undead unit's); a seat of another faction decides as
before.

- **Research order** (`ARMY_RESEARCH_ROLES_V7.UNDEAD`): Zombie, Banshee,
  Lich, Necromancer, Vampire (the Lich was fourth, behind the Necromancer):
  Drill, Hunting, Marksmanship, Forestry, Sawmilling, Administration,
  Scouting, Raiding, Chivalry from a Gathering opener.
- **Shares** (`ARMY_SHARES_V7.undead`, line / defender / ranged / siege /
  breakthrough): 25 / 25 / 20 / 20 / 10 (20 / 30 / 20 / 15 / 15 before);
  against two or more visible ranged, siege, or support units 25 / 20 / 15
  / 20 / 20. One Ghoul for every `ARMY_UNDEAD_SKIRMISHER_PER_UNITS_V7` (5)
  units, at most `ARMY_UNDEAD_SKIRMISHER_MAXIMUM_V7` (2).
- **The Coins for a dear unit** (`armyDearUnitFloorV7`, a candidate
  filter on `TRAIN`). For the Lich, then the Vampire: the role is
  unlocked, its class is below its share, the army has
  `ARMY_DEAR_UNIT_ARMY_V7` (4) units, the Coins in hand do not pay for it,
  and the Coins in hand plus one turn's income do. Then a `TRAIN` that
  would leave less than the price less one turn's income is no candidate
  in a city that is neither threatened nor a frontier center. With a
  hostile unit within `ARMY_PRESSED_RADIUS_V7` of an own center the floor
  is 0. Before, every city spent the Coins of the turn on a 3-Coin unit
  and a seat with Sawmilling never held 8.
- **A Zombie advances together** (`armyZombieAloneV7`). In the committed
  advance of `armyMoveValueV7` a Zombie's Move into the reach of a visible
  enemy, outside its own land, needs an own land unit beside the end tile
  or an own unit that can strike on arrival within
  `ARMY_SUPPORT_RADIUS_V7`. The same test held a Zombie of a seat that had
  not committed (tuning 7).
- **A Zombie bites the dearest unit** (`armyAttackValueV7`): a new bite
  adds `ARMY_ZOMBIE_BITE_VALUE_V7` (4) a Coin of the target's price to the
  attack's strategic value, next to the 12 for cheap line infantry it
  converts. An own Zombie is a unit with Infect **and** Bite
  (`armyZombieV7`): the Abomination, which has Infect alone and attacks
  after a Move, is not one.
- **A Banshee steps up to a Wail** (`undeadMoveValueV7`): the Move to a
  tile from which its Wail hits two or more units (or kills) has the
  Wail's priority plus one when an own melee unit is nearer to the enemy
  than the tile (`armyScreenedV7`), also for a seat that has not
  committed and whatever reaches the tile. Before, an uncommitted Banshee
  took such a tile only where the visible enemies could not kill it.
- **A Vampire strikes and flies back.** `vampireAttackAcceptableV7` also
  accepts a strike that does not kill when a free open-land tile within
  the Vampire's Move leaves it alive after the enemy's turn
  (`vampireEscapeTileV7`, read from the projected view: a zone of control
  may still stop the flight short). After the strike the escape rule of
  the Human Raider (`raiderEscapeRetreatValueV7`, priority 1195) moves it
  to the strictly safer tile.
- **Holding a center** (`ARMY_CENTER_HOLDER_WORTH_V7`): a Defense that is
  higher only against shots (Bones) counts as the unit's own, so a Zombie
  beside a Skeleton is still the unit that steps onto an empty center.
- **A Guard open to ranged attacks** (`armyGuardExposedV7`) is a unit
  whose ranged Defense is below its own: a Skeleton is not held back by
  that rule.

Tests: `tests/unit/ruleset-v7-undead-pass.test.ts` ("the Normal AI's
army", "the Normal AI's units"). Two diagnostic matches are in
[the pass, section 8.2](../product/RULESET_7_TUNING_UNDEAD.md#82-two-diagnostic-matches);
what they left open (the Undead seat's economy in an opening against a
Human seat) is in its section 12.

### The correction after three hand-played games

[Section 13 of the pass](../product/RULESET_7_TUNING_UNDEAD.md#13-the-correction-after-three-hand-played-games)
has the evidence. The constants are in `src/ai/v7-army.ts`, the hooks in
`src/ai/v7.ts`. An **Undead seat's** rules (`armyUndeadSeatV7`: an army
seat whose own faction is Undead):

- **Villages first** (`armyVillagesFirstV7`, `armyVillagesFirstHoldsV7`).
  Through round `ARMY_VILLAGES_FIRST_ROUNDS_V7` (10), while the seat
  knows a free village within `ARMY_VILLAGES_FIRST_REACH_V7` (6) tiles of
  an own center with no hostile land unit within
  `ARMY_VILLAGES_FIRST_DANGER_V7` (2) of it:
  - a Move of a unit that captures and attacks (a Skeleton, a Zombie, a
    Ghoul) to a tile outside its own land where the visible enemies'
    projected damage is above 0 and above what it is where the unit
    stands is no candidate (a Move onto a free village keeps its own
    rule);
  - an attack of such a unit that has already moved this turn, on a unit
    outside the seat's land, that does not kill, is no candidate;
  - the campaign plan (`CampaignArmyFactsV7.villagesFirst`) counts a
    hostile unit as an invader only on the seat's own land, so no unit is
    sent out against one that stands outside it and the free units scout
    and run the village errands.
- **Economy first** (`armyEconomyFirstV7`). While the seat can train the
  first unit of its order (the Zombie) and not the second (the Banshee)
  and owns no technology that builds population, `armyGrowthResearchV7`
  gives the growth technology its land can use, of Hunting, Farming, and
  Forestry only (Fruit, Game, a Farm, a Lumber Camp; never Engineering
  for Mines), by population per Coin of the research chain, a Lumber Camp
  counted `ARMY_ECONOMY_FORESTRY_WEIGHT_V7` (3) times because Forestry is
  also the first step to the Lich. Fruit or Game left to take with a
  technology it owns does not count as growth on offer here. That
  technology has `ARMY_DUE_RESEARCH_PRIORITY_V7`, above training, also
  while the seat expands or is at war, unless a hostile land unit stands
  at the gates of an own city (`armyEconomyResearchV7`,
  `armyAtTheGatesV7`).
- **Pestilence.** With `ARMY_PESTILENCE_LICHES_V7` (2) Liches on the
  board the research order goes to Explosives (by way of Fortification)
  before the Vampire's chain.
- **The garrison swap** (`armySwapsOutV7`, `ARMY_SWAP_PRIORITY_V7` 1251).
  A unit that cannot attack a neighbour (no attack of its own, or a
  minimum range of 2: a Banshee, a Lich) on an own center with a hostile
  land unit within `ARMY_GARRISON_RADIUS_V7` steps off to a tile beside
  the center when an own unit beside the center that can attack a
  neighbour and can still move is the better garrison
  (`armyDefenderWorthV7`). It takes the tile that keeps its Wail, then
  the safest. The step onto the threatened center (1250) then prefers
  the best garrison. `armyDefenderWorthV7` counts a Defense that is
  higher only against shots (Bones) as the unit's own, for every seat.
- **No helpless garrison** (`armyHelplessGarrisonV7`): for an Undead
  seat a role with no attack of its own (the Banshee) is not trained
  onto a contested center while a role that can attack a neighbour is on
  offer there (it was so for a role with a minimum range of 2).
- **Walls** (`preferredReward`): a threatened Undead city takes Walls at
  level 3 (other seats take the Militia unit there).
- **A Banshee walks up** (`undeadMoveValueV7`,
  `ARMY_BANSHEE_APPROACH_PRIORITY_V7` 716): one that belongs to no
  assault (`armyModeV7` `NONE`), with the nearest hostile land unit four
  to `ARMY_BANSHEE_APPROACH_RADIUS_V7` (6) tiles away, moves toward it,
  to a tile no visible enemy reaches or one behind an own melee unit
  where it survives.
- **A Zombie moves with company** (`armyZombieAloneV7`, now also a
  candidate filter). A Zombie's Move that raises the projected damage on
  it, or puts more hostile land units beside it, is no candidate unless
  an own land unit that fights hand to hand (not a support unit, not the
  garrison of a center) stands beside the destination, or one that can
  attack after moving and has not moved yet stands within
  `ARMY_SUPPORT_RADIUS_V7` of it. It applies in the seat's own land too;
  not to a Move onto an own center or onto a free village.

**Every army seat but an Undead one**, in a match with an Undead seat:

- **The shots first** (`armyShootsBiterFirstV7`): an attack from the next
  tile on a full-HP unit with Bite is no candidate while an own unit two
  or more tiles from the target still has an attack on it on offer.
- **The cure** (`armyCureDueV7`): the seat has a Bitten unit, its own
  Captain-role unit has Tend Wounded, and it has no unit that tends.
  Then the Captain's technology is the first research target, and a role
  that tends has `ARMY_CURE_TRAINING_VALUE_V7` (400) more in training.

Tests: `tests/unit/ruleset-v7-undead-pass.test.ts` ("the correction: ...").

## The Goblin pass (`pulp_wars-w49.12`)

**[The Goblin faction pass](../product/RULESET_7_TUNING_GOBLIN.md#8-the-normal-ai)**
(`pulp-wars-poc-7r50`) changed three Goblin unit rules: a Bomb Chucker's
bomb gets no Gang Up, the Orc Brute is Blast-proof, and a Scrap Buggy may
Kaboom after attacking (Crash). What the policy does with them, all in
`src/ai/v7-army.ts` and `src/ai/v7-goblin.ts`; nothing else of the policy
was touched, and a seat of another faction decides as before.

- **Research order** (`ARMY_RESEARCH_ROLES_V7.GOBLIN`): Bomb Chucker, Wolf
  Rider, Rocket Cart, **Warboss**, Scrap Buggy, Orc Brute (the Warboss was
  last and the Orc Brute fifth). From a Gathering opener: Hunting,
  Marksmanship, Scouting, Forestry, Sawmilling, Administration, Raiding,
  Chivalry, Drill. WAAAGH! is the only bonus a bomb still gets and adds to
  every Gang Up kill; the Rocket Cart is the one ranged unit with Gang Up.
- **Shares** (`ARMY_SHARES_V7.goblin`, line / defender / ranged / siege /
  breakthrough): 25 / 10 / 25 / 20 / 20 (30 / 10 / 30 / 15 / 15 before);
  against two or more visible ranged, siege, or support units 20 / 10 /
  25 / 20 / 25. With the dear-unit rule below (20 per Coin of price for a
  class the army is short of) a Goblin seat with 7 Coins and no siege unit
  trains a Rocket Cart.
- **Gang Up** is read from the engine: `gangUpForPolicyV7` returns 0 for a
  role whose mechanics say `gangUpLimit: 0`, and the helper Moves of the
  Gang Up ladders are scored from the combat preview, so no helper is sent
  beside a bomb's target for the bomb's sake.
- **Blast-proof**: `hypotheticalBlastV7` and `hostileKaboomExposureV7`
  leave a Blast-proof unit out, and the engine's Kaboom, chain, and splash
  previews already do. A Kaboom or a bomb beside an own Orc Brute carries
  no friendly-fire cost, and an Orc Brute does not shy from a clump a
  hostile Kaboom would hit.
- **Crash** has no rule of its own. The engine offers `KABOOM` to a Scrap
  Buggy that has attacked, and `kaboomScoreV7` scores it as it scores every
  Kaboom: an army seat's unit blows up only for a kill or on two or more
  enemies, the blast must be worth more than it costs (own losses at twice
  their value, and the Buggy itself, a third of it when visible enemies
  would kill it anyway), and a blast that kills two or hits three without
  hurting an own unit goes before an ordinary kill (1181). So a Buggy
  whose Ram has stopped among enemies crashes, and one that stands among
  its own units does not.

Tests: `tests/unit/ruleset-v7-goblin-pass.test.ts` ("the Normal AI").

### The correction after hand play

Three hand-played games
([the pass, section 1.2](../product/RULESET_7_TUNING_GOBLIN.md#12-the-correction-after-hand-play))
changed the list above and added rules. Where the two differ, this section
is current.

- **Research order:** Bomb Chucker, Wolf Rider, **Orc Brute**, Rocket Cart,
  Warboss, Scrap Buggy (Hunting, Marksmanship, Scouting, Drill, Forestry,
  Sawmilling, Administration, Raiding, Chivalry). The Humans': Marksman,
  Guard, **Swordsman**, Catapult, Knight, Captain (Hunting, Marksmanship,
  Drill, Engineering, Forestry, Sawmilling, Scouting, Raiding, Chivalry,
  Administration).
- **Shares** of a Goblin army: 20 / 20 / 20 / 25 / 15; against two or more
  visible ranged, siege, or support units 15 / 20 / 20 / 25 / 20.
- **Gang Up** is the smallest of the faction's maximum, the role's
  `gangUpLimit` (a Bomb Chucker 0, a Rocket Cart 1), and the helpers, in
  the engine and in `gangUpForPolicyV7`.
- **The weight of a unit in an assault** (`armyFieldStrengthV7`): a unit
  of a kind with Gang Up counts `ARMY_GANG_UP_STRENGTH_V7` (150) percent of
  `armyUnitStrengthV7`. A joined battle in which the seat has one and a
  half times the enemy's units near commits at
  `ARMY_COMMIT_JOINED_COUNT_WEIGHT_V7` (70) percent of the enemy's weight
  (100 without the numbers). Both hold for every army seat; only Goblin
  kinds have Gang Up.
- **The escort** (`armyEscortValueV7`, Goblin seats only): a
  defender-class unit's army Move is worth `ARMY_ESCORT_VALUE_V7` (6) more
  for each own ranged, siege, or support unit it would stand beside, at
  most `ARMY_ESCORT_MAXIMUM_V7` (2).
- **Scrap Buggies:** for a Goblin seat a breakthrough unit's training score
  on a threatened or frontier center is lower by
  `ARMY_FRONT_BREAKTHROUGH_COST_V7` (400). In `kaboomScoreV7` a unit that
  has attacked (a Crash), would be killed by visible enemies
  (`goblinDoomedAtV7`), hits at least one enemy, and kills no own or allied
  unit passes the army gate (a kill or two enemies) and is scored without
  its own price.
- **Bombs:** `armyEngagementsForV7` counts a throw that splashes own or
  allied units when `armyBombSplashAcceptedV7` accepts it: none of them
  dies, and the hit and splash on hostile units are worth at least twice
  the splash on them (`FRIENDLY_FIRE_TRADE_FACTOR_V7`). A Blast-proof unit
  is in no splash. Before, any own unit beside the target ruled the throw
  out as a reason to move.
- **The war clock** (`ARMY_WAR_RESEARCH_ROUNDS_V7`) stays 3. A clock of 2
  was tried for the Human seat that stopped researching and withdrawn (an
  Undead seat then bought no growth building in the pinned opening of
  tuning 7).

Tests: the same file ("the Goblin pass, correction: the Normal AI"), two of
them from recorded positions of the hand-played games
(`tests/fixtures/ruleset-v7-goblin-standing-army.json`,
`tests/fixtures/ruleset-v7-human-research-stall.json`).

## Army play (`pulp_wars-w49.4`)

**The Human tuning, round 5**
([round 5](../product/RULESET_7_TUNING_HUMAN.md#12-round-5)). In four
hand-played games the policy trained a unit every third turn, bought
economy technologies with enemies at its gates, walked its garrison off
walled centers, fed single units into pairs, and left its ranged units
where they had no shot. Army play is the answer: field an army and use it.
The numbers and the composition are in `src/ai/v7-army.ts`; the hooks are
in `src/ai/v7.ts` (`context.army`, `armyAlertV7`, `armyMoveValueV7`,
`armyHuntTargetsV7`, `armyResearchTargetV7`, `armyGarrisonHoldsV7`,
`armyVacatesCenterV7`).

**Who.** A Human, Undead, or Goblin seat in a match whose every seat is
one of those three (`ARMY_PLAY_FACTIONS_V7`). A match with any other
faction keeps that faction's pass and the older policy on both sides, so
no pin or test of the other five factions moved for this reason. It is off
while the seat's naval plan is active (it must cross water to reach
anyone) and while the opening growth harvest is due.

**Alert.** The seat is alert once an enemy city is known or a hostile land
unit is visible within 6 tiles of an own center
(`ARMY_ALERT_RADIUS_V7`). The rules below that say "while alert" are off
before that, so the opening (villages, the free technology, the first
harvests) is the campaign plan's as before.

| Rule                  | What the policy does                                                                                                                                                                                                                                                                                                                                | Priority                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Units first           | While alert, `TRAIN` in a city with a free slot ranks above a city level, every building, and every research. The savings plan (hold Coins for a technology or a level) is off for an army seat.                                                                                                                                                    | 1215 (`ARMY_TRAINING_PRIORITY_V7`)                           |
| Step aside            | The unit on an own center moves to a tile next to it when the city has a free slot, its action, and the Coins for the basic unit, so that the city trains in the same turn. A hostile unit near does not forbid it (the trained unit takes the center); it is exempt from the sole-defender rule.                                                   | 1216 (`ARMY_VACATE_PRIORITY_V7`)                             |
| Composition           | The role trained is the offered one whose class is furthest below its share (`ARMY_SHARES_V7`: line 35, defender 15, ranged 20, siege 15, breakthrough 15; with two or more visible hostile ranged, siege, or support units: 30, 10, 20, 15, 25), the dearer role first in a class; one skirmisher from 5 units; one support unit per 4, at most 2. | the training utility                                         |
| Research toward units | While alert and a fighting role of the tree is locked, the cheapest chain to one (support roles last, skirmishers never) is the research; any other research is not a candidate while that chain costs at most the Coins in hand plus 4 turns of income.                                                                                            | 1165 (`ARMY_RESEARCH_PRIORITY_V7`)                           |
| Combined kills        | The hunt of `pulp_wars-9s0.8` takes every visible hostile land unit as a target (wounded first, at most 12): the units that can hit it this turn, moving in first where they must, attack when together they kill it. Ranged hunters go first; a hit that would be lethal to the hunter is left out; a faction's own rejections are honoured.       | 1171 a hunter's Move, 1172 its hit; a direct kill stays 1180 |
| Engage                | A unit that may attack after moving moves to the tile from which its attack is a kill or deals clearly more than it takes (10 per HP dealt against 8 per HP taken).                                                                                                                                                                                 | 950 (`ARMY_ENGAGE_PRIORITY_V7`), above a chip attack (900)   |
| Firing position       | A siege unit with no shot moves to a tile from which it has one next turn, if the visible enemies cannot kill it there in between (so not inside the reach of an enemy siege unit that would).                                                                                                                                                      | 740                                                          |
| Approach              | A fighting unit at half HP or more with no errand walks toward the nearest visible hostile land unit within 5 tiles; a ranged unit stops at its range.                                                                                                                                                                                              | 720                                                          |
| Together              | A routine Move does not take a melee unit alone into the heavy reach of more enemies (within 3) than it has friends beside it (within 2), nor a ranged, siege, or support unit into lethal reach or into any reach without an own melee unit nearer to the enemy.                                                                                   | a filter                                                     |
| Garrison              | The unit on an own center makes no Move, and no attack that kills it or advances it off the center, while a hostile land unit is visible within 6 tiles, except the step aside and an action the tactical plan allows because another unit takes its place.                                                                                         | a filter                                                     |
| Chip attacks          | The strategic value of an attack that does not kill is scaled by the share of the target's HP it removes, so two units prefer the same target.                                                                                                                                                                                                      | 900                                                          |
| Disband               | A unit at half HP or more is never disbanded.                                                                                                                                                                                                                                                                                                       | a filter                                                     |

**The damage estimate** reads the Human Guard's Defense 1 against an
attack from two or more tiles (`roleDefense2AtDistanceV7`) with the
attacker's longest range, so a melee threat is not overrated. The
Swordsman is a `LINE` role in every role order; a faction without it never
counts it as a missing role.

**What it does not do.** It does not hire, does not blast as a weapon,
does not build a Field Defense in answer to ranged units, and does not
retreat a wounded unit to a Windmill. City attacks are the campaign
plan's, unchanged. Nothing reads hidden state, draws from the PRNG, or
depends on elapsed time.

**Tests.** `tests/unit/ruleset-v7-tuning-5.test.ts` holds one constructed
position for each rule above. The pins of recorded Human, Undead, and
Goblin matches and of the retained late view were recomputed; the late
view's decision is now the training of a Swordsman (21 candidates, 27
before), stated in `scripts/ruleset-v7-late-public-view-contract.ts`.

**The Human tuning, round 4** (`pulp_wars-w49.3`;
[round 4](../product/RULESET_7_TUNING_HUMAN.md#11-round-4)): the policy was
kept legal. It never uses `DRILL_UNIT`. At a level-5+ reward it takes the
reward unit under its old conditions when it is offered (now only in its
first capital, once), otherwise a Barracks, otherwise the Treasury; at
level 4 it still takes Boom (or the Treasury with four neutral tiles
around). Its threat estimate reads `ignoresZocStops`, so it knows a Human
Raider passes its screens. It was not taught that research is now priced by
the technologies owned: it researches as broadly as before and reaches its
tier-3 technologies later (of sixteen Undead mirror matches of 40 rounds
two trained a Vampire; of sixteen Undead against Human matches on Pangea
three trained a Lich).

**The Human tuning, round 3** (`pulp_wars-w49.3`;
[the Human tech tree, round 3](../product/RULESET_7_TUNING_HUMAN.md)): the
policy was kept legal and not taught the new tools. It never uses `HIRE`.
It uses `BLAST_MOUNTAIN` only as the economic action it was, on a Mountain
of its own territory whose blast (`previewBlastMountainV7`) hits no unit of
its own or of an ally. Its combat estimate gives its own units Forest cover
only with its Forestry, reads an enemy's cover where it stands from the
public Defense breakdown, and assumes the cover for an enemy on any other
Forest tile. It does not value Forestry for the cover.

## The assault, expansion, and discipline (`pulp_wars-w49.6`)

**The Human tuning, round 6**
([round 6](../product/RULESET_7_TUNING_HUMAN.md#13-round-6)). Three more
hand-played games on round 5 were bloody, but the policy still lost every
one: with 17 units against 5 behind a gate it walked up and did not
attack, it fed units in one at a time, an Undead seat never took a village
and lost in twelve rounds on one city, and neither the Goblin nor the Human
seat reached its siege or breakthrough unit. The user's bar for this round:
**with overwhelming numbers the AI must break through a prepared line.**
Everything here applies to the seats that play the army rules (a Human,
Undead, or Goblin seat in a match of only those three); the numbers are in
`src/ai/v7-army.ts`, the hooks in `src/ai/v7.ts` (`armyAssaultV7`,
`armyFocusV7`, `armyCommitAcceptsV7`, `armyMoveValueV7`,
`armyAttackValueV7`, `armyResearchTargetV7`, `armyPressedV7`), and
`inspectNormalArmyV7(view)` reports the facts of one decision (the mode of
every unit, the research target and whether it is due, the threat
distance) for tests and diagnostics.

### Positions and their modes

The visible hostile land units are grouped into **positions**: units within
2 tiles of each other, transitively. Every own fighting land unit that does
not stand on an own center belongs to the position whose nearest unit is
nearest to it, when that is within 9 tiles (**coming**); within 5 tiles it
has **arrived**. A unit weighs `4 x price + HP` (a Fighter 20, a Guard 29,
a Swordsman 35, a Catapult 42, a Knight 49, a Goblin 10); a hostile unit
behind Walls or on a Field Defense weighs half as much again, on a center
without Walls, in a Forest, or on a Mountain a quarter more.

| Mode       | When                                                                                                                                                                                                                                              | What the units of the position do                                                                                                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Commit** | the arrived units weigh 150% of the position; or 100% once the battle is joined (an own unit next to a unit of the position, and a unit of the position wounded); or the coming units weigh 150%, 60% of them have arrived, and those weigh 100%. | They close in together, attack as described below, are not held back by the reach they enter (a ranged, siege, or support unit still stays out of lethal reach), and make no routine Move that takes them farther from the position.                                                                       |
| **Stage**  | the coming units weigh 150% but too few have arrived.                                                                                                                                                                                             | The units coming walk up, from up to 9 tiles, and stop outside every visible enemy's reach. The units that have arrived wait there: no Move into reach except for a kill, no Move away. Nobody attacks piecemeal (the tuning-5 exchange rules still allow a kill or a clearly favourable attack on offer). |
| **None**   | otherwise (no clear superiority).                                                                                                                                                                                                                 | The rules of tuning 5: an acceptable exchange, a combined kill, nobody alone into heavy reach.                                                                                                                                                                                                             |

A single-file front (`src/ai/v7-chokepoint.ts`) keeps its own siege, and
these modes do not move its units. The weights still count there: when the
position of a garrison unit would be committed, the siege is in its
assault ([numbers at a gate](#numbers-at-a-gate)).

### What a committed unit attacks

A committed unit takes an exchange it would otherwise refuse (it deals
less than it takes) when **one** of these holds, and never an attack that
kills it without a kill, deals nothing, or that a faction rule rejects
(friendly bomb splash, a fed Zombie):

- **the battle is joined** (see the table);
- **the target is in this turn's focus**: the committed units that can hit
  it this turn (from where they stand, or after a Move for a unit that may
  attack after moving; each unit counted once, against the unit it can
  take the largest share of HP from) can together take half its HP;
- **the unit is lost anyway**: the visible enemies can kill it where it
  stands.

So six Fighters commit against a Guard on a Field Defense with a Marksman
behind it (120 against 71), three of them can reach it and take 12 of its
17 HP, and it dies on the second turn; three Fighters (60 against 71) do
not attack it at all, as under tuning 5.

**Order of a committed turn** (priorities; a kill stays 1180):

| What                                                                                               | Priority |
| -------------------------------------------------------------------------------------------------- | -------- |
| a fast unit (Move 2 or more) moves to where it hits a ranged, siege, or support unit               | 1177     |
| a shot from two or more tiles that does not kill                                                   | 1176     |
| a ranged unit moves to a tile with a shot                                                          | 1175     |
| a melee attack that does not kill                                                                  | 1174     |
| a melee unit moves into contact                                                                    | 1173     |
| the combined kills of tuning 5                                                                     | 1171/2   |
| a siege unit that cannot fire moves to a tile with a shot next turn (ahead of the units behind it) | 765      |
| a unit that cannot attack this turn closes in                                                      | 760      |

Within one priority the strategic value decides, and it prefers: the unit
the hit brings closest to dying (tuning 5); a unit in this turn's focus
(+15); for a shot, an **anchor** (a unit in cover or on a fortification,
or a defender-class unit: +12); for a fast or ranged unit, a ranged,
siege, or support target (+30, in every mode). A melee kill advances onto
the dead unit's tile by the rules, which is how a gap opens; a Raider
(it ignores zones of control) goes through a one-tile gap to a Catapult
before the line fights; a capturer that can step onto an empty hostile
center does (priority 1290, as before) and captures next turn; the
defender of a center the campaign marches on is a combined-kill target as
before.

### Expansion and growth

- **Villages.** A capturer that can step onto a free village does, if the
  visible enemies cannot kill it there: priority 1170 while the seat owns
  fewer than three cities (above an exchange at 950 and a chip at 900,
  below a kill), 960 afterwards. A unit standing on a free village makes
  no Move and no attack that would take it off the tile (a capture needs
  the unit to start its turn there), unless it would die there. A unit the
  campaign sent to a village turns aside only for a kill while the seat
  has fewer than three cities.
- **The first units.** While the seat has fewer than three cities it
  trains as if alert (the unit on its center steps aside, the city trains
  before research), so the units that take the villages exist by round 3.
- **Growth before training.** With no hostile land unit within 4 tiles of
  an own center, an economic action that levels a city now, or adds
  population for at most 2 Coins a point (a harvest, a hunt), goes before
  training (priority 1218). A Monument is free and is built at once in
  every state.
- **Training against the rest.** With no enemy near, an enemy city known,
  and two thirds of the unit slots filled (`warTrainingFirstV7`, the rule
  of `pulp_wars-9s0.1`), training drops below the growth that adds
  population (1135): Farms, Lumber Camps, Mines, and Markets are bought
  first and the army is topped up with what is left. Below two thirds of
  the slots, with an enemy within 4 tiles, at a single-file front, or with
  fewer than three cities, training keeps its tuning-5 place (1215).
- **Pressed.** With a hostile land unit within 3 tiles of an own center
  and a city that can still train this turn (a free slot, its action, and
  a free center or a unit on it that can still step aside), no research
  and no construction that costs Coins is a candidate. Once every such
  city has trained, the rest of the Coins is free.
- **Rewards.** At level 4 the seat takes Boom (3 population), never the 6
  Coins.

### Research

The army's next technology is the first step toward the first unit of the
faction's own order that the seat cannot train yet
(`ARMY_RESEARCH_ROLES_V7`), from the first turn and not only while alert.
Each faction's signature units come first:

| Faction | Units in order                                                         | Technologies from a Gathering opener                                                                                           |
| ------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Humans  | Marksman, Guard, Swordsman, Catapult, Knight, Captain                  | Hunting, Marksmanship, Drill, Engineering, Forestry, Sawmilling, Scouting, Raiding, Chivalry, Administration (the Goblin pass) |
| Undead  | Zombie, Banshee, Lich, Necromancer, Vampire                            | Drill, Hunting, Marksmanship, Forestry, Sawmilling, Administration, Scouting, Raiding, Chivalry (the Undead pass)              |
| Goblins | Bomb Chucker, Wolf Rider, Orc Brute, Rocket Cart, Warboss, Scrap Buggy | Hunting, Marksmanship, Scouting, Drill, Forestry, Sawmilling, Administration, Raiding, Chivalry (the Goblin pass)              |

(The first draft of this bead used one class order for all three, ranged,
siege, breakthrough, line, defender, support, which put the Zombie ninth.)
With `ARMY_ROADS_CITIES_V7` (3) or more cities, Roads (by Scouting) is the
target once the first `ARMY_ROADS_AFTER_ROLES_V7` (2) units of the order
can be trained, and Commerce after the last unit; a seat with fewer cities
researches neither by this rule.
Other research is no candidate while that technology costs at most the
Coins in hand plus four turns of income (tuning 5).

The technology is **due** while the seat's city levels add up to at least
twice the technologies it owns beyond the first
(`armyResearchDueV7`): research and growth advance together.

| State                                                                | Priority of the army's technology                 |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| due, no enemy within 4 tiles, three cities or no city that can train | 1219: before growth and training                  |
| due otherwise                                                        | 1165, or 1206 when the Coins are there (tuning 5) |
| not due                                                              | 1130: after the growth that adds population       |

While it is due and within two turns of income, construction that is
neither a city level nor cheap growth waits for it (the savings plan of
tuning 5); training never waits.

### The mix by faction, and Zombies

`armySharesV7(faction, fragile)` gives the shares of the land army in
percent (line / defender / ranged / siege / breakthrough): Humans 35 / 15 /
20 / 15 / 15, **Undead 25 / 25 / 20 / 20 / 10** (the Undead pass; 20 / 30
/ 20 / 15 / 15 before; the defender is the Zombie), **Goblins 20 / 20 /
20 / 25 / 15** (the Goblin pass; 30 / 10 /
30 / 15 / 15 before); against two or more visible
ranged, siege, or support units 5 points (Humans 10) move to the
breakthrough unit (the Undead: 25 / 20 / 15 / 20 / 20). A Goblin army has
a Wolf Rider per four units (at most three), an Undead army a Ghoul per
five (at most two, the Undead pass); a Human one one skirmisher from five
units.

An own Zombie (an Undead unit with Infect) of an army seat:

- values an attack on cheap line infantry (a line unit of at most 2 Coins:
  a Fighter, a Skeleton, a Goblin) 12 strategic value higher: what it
  kills rises as a Zombie;
- approaches, and closes in when committed, on the nearest such unit and
  not on the nearest hostile unit, when one is visible;
- pays 5 strategic value per hostile ranged or siege unit that reaches the
  end of a Move, less those that reach the tile it stands on
  (`armyZombieShyV7`): of two tiles it takes the one out of their reach,
  and where every tile is under the same fire it still moves.

### The dear units

`armyRoleScoreV7` adds 20 per Coin of price to a role whose class the army
is short of. In a mixed army of cheap units the next unit trained is the
breakthrough or the siege unit when the Coins are there (a Goblin seat
with 12 Coins and two units trains a Scrap Buggy, not a Goblin), and the
other one follows; a class that has its share is bought in its cheapest
useful unit as before.

### Discipline

| Rule                                                                                                                                                                                                                                            | Where                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| An attack on an enemy unit standing on an own center is made whatever the exchange (not one that kills the attacker without a kill).                                                                                                            | priority 1345, exempt from the low-value filter |
| The unit on an own center does not make an attack that does not kill while it can still step aside for its city to train: it steps aside, the city trains, and it attacks from the new tile if it can.                                          | `armyGarrisonHoldsV7`                           |
| A city does not train onto a center that two or more hostile ranged or siege units can hit next turn while another city can train, unless a hostile capturer can walk onto that center next turn.                                               | `armyTrainsElsewhereV7`                         |
| A Move that ends next to own units, on a tile a hostile unit whose attack splashes (a Bomb Chucker, a Lich) can hit or next to one, costs 6 strategic value per neighbour, so another tile of the same priority is taken.                       | `armySplashSpacingV7`                           |
| A Guard open to ranged attacks (the Human Guard) makes no routine Move, and no step aside, into the open inside the reach of a hostile ranged or siege unit; a center, a Field Defense, a Mountain, or a Forest that covers it is not the open. | `armyGuardExposedV7`                            |
| A unit near (within 4 tiles of) an own center with an enemy within 3 tiles of it does not walk away from that center, and a Move that brings it nearer is taken.                                                                                | priority 725                                    |
| A fighting unit outside the own territory with a hostile unit within 5 tiles and no own fighting unit within 3 goes back toward the nearest own unit when it has nothing to attack (also the scout).                                            | priority 705                                    |
| With Raiding, a unit moves onto a hostile improvement to Pillage it in the same turn.                                                                                                                                                           | priority 955                                    |
| A Kaboom is used only for a kill or on two or more enemies.                                                                                                                                                                                     | `kaboomScoreV7`                                 |

### Cost

One pass over the visible hostile land units to link the positions and one
over the own land units to weigh them, once per decision; the focus adds,
for each committed unit and each unit of its position, a range check per
Move destination and at most one damage projection. Nothing draws from the
PRNG or depends on elapsed time, and the work is inside the existing
scoring phase (no new phase, no new bound). On the 16 x 16 breakthrough lab
(26 to 33 attacking units at the start) the bounded run took 5.8, 7.3, and
7.1 ms a decision for the Human, Goblin, and Undead attacker on the
development machine, and 5.2, 6.5, and 6.4 ms with the round-5 source on
the same lab; the slowest decision was 63 to 65 ms in every run of either. On two
generated 14 x 14 matches the average was 2.6 and 3.5 ms and the slowest
decision 24 and 28 ms.

### Numbers at a gate

The siege of a single-file front
([below](#siege-of-a-single-file-front-pulp_wars-68k6)) attacked a healthy
holder only once 30 unspent Coins had piled up (`chokepointAssaultV7`),
and the first draft of this bead switched the assault off at such a front.
A seat with 17 to 23 units in front of a one-tile gate and no pile of
Coins never attacked: the user's exact complaint. Now
`chokepointAssaultOnV7(context)` is true when the clock has struck **or**
the seat plays the army rules and the position of a unit of the front's
garrison is committed by the weights above (`chokepointNumbersV7`). Every
rule of the siege that read the clock reads this instead:

- siege and ranged units take firing tiles inside lethal reach, and their
  fire still goes first, at one holder (priority 1112);
- the head advances into lethal reach and the column moves up behind it;
- the committed melee attack (1108) is made on the focus whenever the
  attacker survives it: with numbers the condition "this turn's attackers
  out-damage the holder's idle recovery" is dropped, so the gate is fed
  every turn; a head below half HP rotates out as before and the next
  strongest unit steps in;
- with Explosives, a `BLAST_MOUNTAIN` outside the own territory is a
  candidate when its Mountain is next to the corridor or to a holder, or
  the blast hurts the garrison, and it hits no own unit (the setter is
  spared by the rules): priority 1114, before the fire
  (`chokepointBlastV7`).

A second route is not searched for: the front exists only while every
explored land route runs through the corridor, the campaign plan's scouts
keep exploring, and the plan is null the turn another route is known.
Without numbers and without the clock the siege is unchanged (its twenty
tests pass as they were). Tests: "numbers at the gate" in
`tests/unit/ruleset-v7-chokepoint-ai.test.ts`.

### What it does not do

It does not hire, blasts a Mountain outside its territory only beside a
gate it attacks with numbers, and does not build a Field Defense in answer
to ranged units (as before). It does not pull a wounded
unit out of a committed fight. A position is judged by what is visible: a
unit on a tile the seat has not explored is not counted. "Pressed" ends
when every city that can train has trained, so a seat under siege still
researches with what is left that turn.

**Tests.** `tests/unit/ruleset-v7-tuning-6.test.ts` holds a constructed
position for each rule above and the bounded run of the three labs (twice
the defender's unit value against a script that focuses its fire, retrains,
and refills the line; the round the capital falls is pinned, and the
round-5 policy takes one to two rounds longer on each).

## Committing, growing, and following through (`pulp_wars-w49.10`)

**The Human tuning, round 7**
([round 7](../product/RULESET_7_TUNING_HUMAN.md#14-round-7)). Round 6 was
played by hand five times. Starting massed at twice the value, all three
factions broke a hand-defended line by round 4; the Human AI took the
capital, the Undead and the Goblin AI stalled in front of a defender that
stepped back a tile a turn (22 units against 11 to 15, whole turns without
an attack). In a six-seat game the Human AI had 42 units and kept 8 to 12
of them beside the player's city for seven rounds without an assault, and
the Goblin and Undead seats did not grow. The user's ruling: **the AI
first; with overwhelming numbers it must break through and keep going.**
This section is what changed. It applies to the seats that play the army
rules (a Human, Undead, or Goblin seat in a match of only those three),
replaces the passages of the two sections above that it names, and changes
no rule of the game: the identity stays `pulp-wars-poc-7r49`. The numbers
are in `src/ai/v7-army.ts`, `src/ai/v7-campaign.ts`, and
`src/ai/v7-goblin.ts`; the hooks in `src/ai/v7.ts` (`armyAssaultV7`,
`armyHoldsFastV7`, `armyMeleeReachV7`, `armyChainSpacingV7`, `armyWarV7`,
`armyCanTrainV7`, `armyGrowthResearchV7`, `armyWarHoldsResearchV7`,
`armyFrontCenterV7`, `waaaghUsefulV7`); `inspectNormalArmyV7(view)` also
reports every position with its weights.

### Why it parked, and why it stalled

| Seen                                                          | Root cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8 to 12 units beside a city for seven rounds, 42 units in all | A position was every hostile unit linked by gaps of two tiles, without a bound. The player's 23 units stood in one chain across his land, so the army in front of one city was weighed against all of them and never had half as much again. And the campaign sent every unit to its own nearest enemy city: 36 units stood on three fronts at parity. A position that is not committed is attacked only where a combined kill or an exchange in the attacker's favor exists, and cheap units against Swordsmen in cover have neither. |
| 22 units against 11 to 15 and no attack for two turns         | The battle counted as joined only while a unit stood next to the enemy. A defender that steps back a tile breaks the contact; the assault then needed 150% by weight again, and 22 cheap units against Catapults and Swordsmen weigh about 115%.                                                                                                                                                                                                                                                                                       |
| Zombies, Orc Brutes, Liches, Rocket Carts never caught up     | A unit that cannot attack after it moved never reaches a unit that steps back; the Lich and the siege units also refused every tile inside the reach of an enemy Catapult, which is every tile from which they fire.                                                                                                                                                                                                                                                                                                                   |
| Capital at 0 of 3 population all game, unit limit with Coins  | Growth was "buy the harvest on offer". Once the Fruit and the Game of the capital are eaten nothing is on offer, and the research order holds only unit technologies. And "pressed" (an enemy within three tiles of a center: nothing but units) stayed on while "a city can still train" was true of a city with an enemy standing on its center.                                                                                                                                                                                     |
| Five economy technologies in ten rounds of battle             | "An enemy near" meant near an own center. An attacker fights far from its centers.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

### Positions, weights, and modes

- **A position is local.** The seed is the hostile unit nearest to an own
  fighting unit; its position is every hostile unit linked to it by gaps of
  at most two tiles that stands within `ARMY_POSITION_SPAN_V7` (4) tiles of
  the seed. The next unit not yet in a position seeds the next one.
- **Numbers are numbers.** With at least 150% of the position's units
  (`ARMY_COMMIT_COUNT_RATIO_V7`) the arrived units commit at 110% of its
  weight (`ARMY_COMMIT_COUNT_WEIGHT_V7`; at equal weight cheap units
  against dear ones in cover only bled); otherwise the weight rule of round
  6 holds (150%, or 100% once the battle is joined). The same count makes
  "coming in strength" for staging.
- **The battle stays joined** while an own unit has arrived (within five
  tiles) and a unit of the position is wounded, or an own unit is in
  contact and an arrived own unit is wounded. Contact alone is no longer
  the test, so a line that steps back is attacked again.
- **Staging never holds an army that has the weight.** The order of the
  mode function is unchanged: commit when what has arrived suffices, stage
  only when what is coming suffices and what has arrived does not.

### The fast units and the slow units

| Rule                                                                                                                                                                                                                                                                                                                                       | Where                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| A fast unit (Move 2 or more) of a staged or committed position makes no Move into the enemy's reach, next to a unit of the position, or nearer to it than the foremost slow unit, until the position is **ready**. A unit already under fire, and a raider (below), are free.                                                              | `armyHoldsFastV7` (a filter, and no hunter) |
| Ready: half of the position's slow units (Move 1) attack this turn (one that has attacked, one in range, one that can still move into range and attack), or an own unit is in contact, or the position is **on the move**: half of its units moved in their owner's last turn (a unit's activation is public until its owner's next turn). | `ArmyPositionV7.ready`, `.mobile`           |
| So against a prepared line the Knights, Scrap Buggies, Vampires, and the fast skirmishers land in the turn the infantry strikes; against an army that gives ground they lead the chase.                                                                                                                                                    |                                             |
| A unit that cannot attack after it moved and fights hand to hand (a Zombie, an Orc Brute, a Guard) makes no routine Move into the enemy's reach outside its own land without an own unit within two tiles that can strike on arrival. Committed, it goes with its position.                                                                | `armySlowMeleeV7`                           |
| Committed, such a unit marches on the enemy's center when one is within six tiles (never away from the enemy in front of it): the enemy must come to the block or give the city up. A tile beside its own units is worth 2 per neighbour.                                                                                                  | priority 760                                |
| Committed, a unit is no longer held by the reach it enters; a ranged, siege, or support unit still makes no Move to a tile where a hostile melee unit reaches it and the visible enemies can kill it. The Lich's and the Vampire's own safety rules (`pulp_wars-vkq.21`) give way to this in a committed position, not elsewhere.          | `armyMeleeReachV7`                          |
| A Goblin unit's committed Move is not held by the exploder spacing rule (it still costs the Move strategic value); the splash of its own Bomb Chucker's target and the reach of a hostile Kaboom hold it as before.                                                                                                                        | `goblinMoveValueV7`                         |
| A wounded unit (half HP or less) beside other weak links (wounded units, siege and ranged units), inside the reach of a hostile unit with Overrun, steps to a tile with fewer of them that is no nearer to the enemy, before it recovers.                                                                                                  | priority 936 (`armyChainSpacingV7`)         |

### Siege units

A siege unit with a shot fires; one without moves to a tile with a shot
next turn (round 6). New: committed, it takes such a tile under the enemy's
shots; the value of a firing tile loses 60 where a hostile melee unit
reaches it and 25 on a center, and gains 10 behind an own line unit and 8
when the target is one tile inside the range (so that a step back does not
end the shot). A city whose center a visible hostile melee unit could
attack after one more step (its Move and 2 tiles) trains as a threatened
city does: a body, not a siege unit (`armyFrontCenterV7`).

A siege unit cannot catch a unit that steps back a tile a turn; no rule
changes that. What a retreating defender cannot move is its center, and
the block of slow units marches on it.

### Growth

- **At the unit limit, population.** When no own city can train now
  (`armyCanTrainV7`: a free slot, the city action, and a training on offer
  or the unit on its center able to step aside), an economic action that
  adds population or levels a city has priority 1218, in every state, and
  the savings plan does not hold it for a technology.
- **Nothing to buy: the growth technology.** A seat whose every city is at
  its unit limit, that owns the technology of the first unit of its order,
  and whose owned technologies leave no growth action with a target on its
  land, researches the first step toward the growth action its land has the
  most use for per Coin of research (`ARMY_GROWTH_KINDS_V7`: harvests,
  Farms, Lumber Camps, Mines, and the four buildings; a Farm or a Mine
  counts 2). That technology is always due.
- **Pressed is real.** "A city can still train" is read from the offered
  commands. A city with an enemy unit on its center, or whose garrison has
  no tile to step to, is not one.
- **A naval seat's garrison steps aside.** The step off a center so that
  its city can train (`armyVacatesCenterV7`) was made only by a seat that
  trains first, which a seat with a naval plan is not. When no training is
  on offer anywhere, such a seat now makes it too: two Undead seats of an
  Archipelago had each a unit on both of their centers and trained nothing
  for a hundred rounds (the mirror match of
  `tests/unit/ruleset-v7-undead-ai.test.ts`, seed 4).

### Wartime spending

An enemy army is **in the field** (`armyWarV7`) when a hostile land unit
is within four tiles of an own center or within five of an own fighting
unit off its center. Then:

1. every city that can train trains (priority 1215), and while one can, no
   research and no construction that costs Coins is a candidate;
2. with no city able to train, growth is bought (above);
3. research is a candidate only with neither, except the one step to a
   unit whose class the army has none of (`armyWarHoldsResearchV7`).

The savings plan does not hold construction for a unit technology while
the army is in the field.

### Abilities

| Ability                          | Use rule                                                                                                                                                                                       | Test (`ruleset-v7-tuning-7.test.ts` unless named)                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| WAAAGH! (Warboss)                | With two or more units in its radius that will attack this turn: at once (1235). New: it first moves to a tile from which that is true (1236), so the call comes before the attacks.           | "6. abilities"                                                           |
| Kaboom                           | For a kill, or on two or more enemies (round 6). New: a blast that damages three hostile units is taken at the priority of a kill, and a Goblin moves to a tile from which it has one.         | "6. abilities"; `ruleset-v7-tuning-6.test.ts`                            |
| Wail (Banshee)                   | Whenever a living enemy is in range. New: committed, a Banshee moves into range behind an own line unit and Wails before the melee (1175, 1176); it counts as a fighting unit of its position. | "6. abilities"                                                           |
| Lich splash and Plague           | A volley that plagues three or more units outranks a kill (revision 14).                                                                                                                       | "6. abilities"                                                           |
| Frenzy, Raise Dead (Necromancer) | Frenzy before the attacks of the units beside it; Raise Dead when a raised Skeleton survives (revisions 13 and 14).                                                                            | "6. abilities"; `ruleset-v7-undead-ai.test.ts`                           |
| Devour (Ghoul)                   | To heal 4 or more, or to deny a Grave (revision 13).                                                                                                                                           | `ruleset-v7-undead-ai.test.ts`                                           |
| Rally, Tend Wounded (Captain)    | With two or more units to inspire; to heal or cure (revision 11 and 14).                                                                                                                       | `ruleset-v7-tactical-ai-r11.test.ts`, `ruleset-v7-revision14-ai.test.ts` |
| Escape (Raider), Pillage         | Out of lethal reach after its attack; onto an enemy improvement with Raiding (round 4).                                                                                                        | `ruleset-v7-tuning-4.test.ts`                                            |

### The strategic choice (`src/ai/v7-campaign.ts`, `CampaignFactsV7.army`)

- **One front, chosen by reach and opportunity.** Every known hostile
  city is a candidate. Its cost is its reach (the walk from the nearest
  free army unit or own center, a walled city counting 2 farther), plus up
  to 6 steps for the visible units within three tiles that hold it (their
  strength against the free army's: `CAMPAIGN_FRONT_DEFENSE_STEPS_V7`),
  less 4 where a free unit is within three tiles of a holder
  (`CAMPAIGN_FRONT_WAR_STEPS_V7`: the army is already at war there). The
  cheapest city is the main front and the free army marches on it. Nothing
  about the seat as a whole counts: not its city levels, not its army
  elsewhere, not who plays it. A strong neighbor whose border city is in
  reach is attacked there. (The first draft of this pass marched on the
  seat with the fewest city levels, which left a strong seat, the
  competent human, for last.) The pair of units for every other seat is
  gone.
- **A surplus opens another front.** A front needs twice the strength of
  the visible holders of its city (`CAMPAIGN_FRONT_NEED_RATIO_V7`), at
  least 10 units for the main front and 6 for a further one
  (`CAMPAIGN_FRONT_MAIN_UNITS_V7`, `CAMPAIGN_FRONT_MIN_UNITS_V7`). What the
  free army has above the main front's need goes, in the size the next
  cheapest city needs, to that city; a city of a seat with no front yet
  counts 3 steps nearer (`CAMPAIGN_FRONT_SAME_SEAT_STEPS_V7`). The main
  front keeps its need once more for every front already open, so a second
  front takes 16 units against lightly held cities and a third 32.
- **Holding forces.** A unit within four tiles of an own center with a
  hostile unit within four tiles of that center keeps its nearest target.
  The holders of a hostile city (units within three tiles of it) do not
  count as such an enemy: an army in front of an enemy city three tiles
  from its own is a front. (Before this correction a seat with 40 units in
  the diagnostic match had one free unit: nearly all of them "held" the
  city they had gathered at.)
- **Raids.** A hostile city with no hostile unit on or next to its center
  gets the nearest free capturer with Move 2 or more within ten steps
  (`raid` on its assignment). It goes at once, is not held with the fast
  units, turns aside only for a kill, and its city's wave sets out.
- **Villages.** The errands go to the capturer that needs the fewest
  turns (a slow melee unit counts three turns more), the villages with a
  hostile unit or city within three tiles last; a slow melee unit steps
  onto a village only where no visible enemy can hit it.

### Cost

Two per-view and per-decision caches came with this pass: a city's
attributable income per view (a Raider's picket value sorted every own
city by it for every Move it was offered; a fifth of the decision time of a
seat with seventeen cities) and the danger of a view unit on a tile per
decision. Nothing draws from the PRNG or depends on elapsed time.

| Run (development machine)                               | Round 6                                | Round 7                                |
| ------------------------------------------------------- | -------------------------------------- | -------------------------------------- |
| The three labs (revision 2), both scripts, per decision | 5.6 to 6.4 ms, slowest 66 ms           | 6.7 to 9.6 ms, slowest 104 ms          |
| 20 x 20, six seats, 30 rounds: per AI turn              | mean 175 ms, p95 1.0 s, slowest 2.9 s  | mean 169 ms, p95 1.0 s, slowest 2.7 s  |
| The same match: per decision                            | mean 10.3 ms                           | mean 8.6 ms                            |
| 25 x 25, eight seats, 24 rounds: per AI turn            | mean 130 ms, p95 0.42 s, slowest 1.2 s | mean 148 ms, p95 0.47 s, slowest 0.6 s |

(The many-seat budget of `pulp_wars-ykw.4` is a mean of 1.5 s and a p95 of
5 s per AI turn. The matches differ between the two policies, so the rows
compare like with unlike. The eight-seat row was measured before the last
corrections of this pass: the count rule's weight bar, the gate on growth
research, and the naval seat's step aside.)

### What it does not do

It does not retreat a unit from a committed fight (the step out of a kill
chain is the one exception), does not move a line unit to stand between
its siege units and an enemy fast unit (the siege unit picks the screened
tile), and does not hire or build a Field Defense under fire. The front
is chosen again every turn from what is visible, without memory: a city
that has just changed hands and is lightly held can draw the main front
away from a siege for a few turns. A committed Zombie with a striker
beside it still takes the tile out of the enemy's reach when both tiles
bring it as near to the enemy's center (a bonus for the nearer tile was
tried: the Undead attacker of the lab took a round longer and lost five
more units). The engine's public threat query (`queryThreatenedTilesV7`)
is a geometric envelope of Move plus range and so counts a Move and an
attack also for a unit that cannot attack after it moved (a Guard, a
Zombie, a Catapult); engine previews and many tests read it, so only the
text harness and the policy's own reach (`unitMayActAfterMoveV7`) correct
for it. A position is still judged by what is visible.

**Tests.** `tests/unit/ruleset-v7-tuning-7.test.ts` holds a constructed
position for each rule (the parked army and the line that stepped back
among them), one sixteen-round match of two Normal seats on the map of the
hand-played Undead game that reads only what the Undead seat bought, and
the bounded lab run against the defender that gives ground
(`tests/fixtures/v7-breakthrough-lab.ts`); the run against the defender
that holds is in `tests/unit/ruleset-v7-tuning-6.test.ts`.

## Capturing, researching, and real numbers (`pulp_wars-w49.11`)

**The Human tuning, round 8**
([round 8](../product/RULESET_7_TUNING_HUMAN.md#15-round-8)). Round 7 was
played by hand four times. The AI broke lines and then did not take what it
had reached: a Raider rode onto an undefended center and rode off again, an
army stood two tiles from an empty capital for four turns, seats at war all
game owned three technologies in round 25, single units rode at held
cities, and the Goblin seats stayed at two cities. The user's ruling
stands: **the AI first; with overwhelming numbers it must break through.**
This section is what changed. It applies to the seats that play the army
rules (a Human, Undead, or Goblin seat in a match of only those three),
replaces the passages of the three sections above that it names, and
changes no rule of the game: the identity stays `pulp-wars-poc-7r49`. The
numbers are in `src/ai/v7-army.ts` and `src/ai/v7-campaign.ts`; the hooks
in `src/ai/v7.ts` (`armyStormV7`, `armyHoldsCenterV7`, `armyStormWaitsV7`,
`armyStormMoveV7`, `armyResearchClockDueV7`, `armyResearchFloorV7`,
`armyWarHoldsResearchV7`, `armyGatedV7`, `armySpentV7`, `armyLostAnywayV7`,
`armyGarrisonYieldsV7`, `armyCapitalGrowthV7`, `waaaghAttacksV7`);
`inspectNormalArmyV7(view)` also reports `expanding`, the research clock,
and each position's `heldCity`.

### What was seen, and why

| Seen (hand-played game)                                                                   | Root cause                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Raider killed the garrison, advanced onto the center, and left it (`r7c`, twice)        | The Raider's Escape after an attack (priority 700) and the rejoin of a lone unit knew nothing of the center under the unit. Nothing held a capturer on a hostile center but the capture itself, which is offered a turn later.                                               |
| An empty capital two tiles from the army for four turns (`r7a`)                           | The position was staged (not enough weight for the units behind the capital), and a staged unit makes no Move into the enemy's reach. The step onto an empty hostile center (1290) existed, but no capturer stood within one Move of the center, and nothing sent one there. |
| Three technologies in round 25 (`r7b`, `r7d`)                                             | Round 7 put units, then growth, then research while an enemy army is in the field. A seat that fights all game spends every Coin on units, and "pressed" (an enemy within three tiles of a center) allowed nothing else.                                                     |
| One unit at a time at a held city (`r7c`)                                                 | A unit of a holding force whose position has mode `NONE` (too weak to stage) still took every "move in and kill" (1177) and every hunt. And the raid on an "undefended" city looked one tile around its center.                                                              |
| A second front of six against a walled city with Catapults                                | A front was sized at twice the holders within three tiles by plain weight, and took the nearest units whatever they were.                                                                                                                                                    |
| Two cities all game for a Goblin seat with a village three tiles from its capital (`r7d`) | Before contact every unit followed the first scout; it walked into a pocket of Mountains, and the rally rule of round 6 kept the rest beside it.                                                                                                                             |
| Bomb Chuckers that did not throw                                                          | Their own units closed in first; a bomb that splashes its own units is not thrown.                                                                                                                                                                                           |
| WAAAGH! with no attack after it                                                           | The call counted the units in its radius that had an enemy in reach, not the ones that would strike.                                                                                                                                                                         |
| A Zombie left its walled last center for a fresh Skeleton; a doomed unit made no attack   | The step off a center so that the city can train did not compare the two garrisons; an attack at a loss was filtered also for a unit that dies anyway.                                                                                                                       |

### Capturing what it reaches

- **A capturer on a hostile center stays** (`armyHoldsCenterV7`, a
  filter): no Move, no Escape, no Pillage elsewhere, and no attack that
  would move it off the tile (a melee kill advances). It attacks what it
  can hit from the center without leaving, recovers, and captures at the
  start of its next turn.
- **A center is stormed** (`armyStormV7`) when an own capturer stands on
  it, when it is empty, or when the shots on offer this turn kill its
  garrison ("doomed"). The stormers are the nearest capturers within
  `ARMY_STORM_RADIUS_V7` (6) tiles: two, and one more for every two hostile
  ranged or siege units within four tiles of the center, at most five. A
  stormer moves toward the center at priority 762 (`ARMY_STORM_PRIORITY_V7`,
  just above a committed advance), whatever the mode of its position: a
  staged army still walks its stormers up. A stormer never raids, pillages,
  or rejoins.
- **Shots first, then the step, in one turn.** A shot at the garrison of
  a stormed center with a stormer one Move away scores 1344
  (`ARMY_STORM_FIRE_PRIORITY_V7`); the first stormer in reach waits while
  the garrison is doomed (`armyStormWaitsV7`), and then takes the step onto
  the empty center (1290).
- **The sturdiest unit goes in.** The step onto an empty hostile center
  adds the unit's HP times its Defense (the mean of the Defense hand to
  hand and against shots; `ARMY_CENTER_HOLDER_WORTH_V7`) to its strategic
  value, so of two units beside the center the one more likely to live
  through the enemy's turn takes it.
- **Cover.** With an own unit on a hostile center, the three nearest
  fighting units come up beside it (`ARMY_COVER_UNITS_V7`), also from a
  staged position.

### Research while at war

Round 7's order (units, growth, research) is replaced for a seat at war:

1. **Every city that can train trains** (1215), as before.
2. **Research is on a clock** (`armyResearchClockDueV7`): the next
   technology of the faction's order is due when the round is at least
   `ARMY_WAR_RESEARCH_ROUNDS_V7` (3) times the technologies owned; for a
   poor seat the factor is the turns its income needs to pay the price
   plus one (`armyResearchRoundsV7`,
   `ARMY_WAR_RESEARCH_SPARE_TURNS_V7`); for a rich seat
   (income of 15 or more, or twelve units and half as many again as the
   largest hostile seat it sees: `armyRichV7`) it is 2. A due technology is
   bought before the units (1219).
3. **The floor.** While a technology is due and not yet affordable, the
   seat keeps its price less one turn's income (`armyResearchFloorV7`):
   training and paid building that does not level a city wait, whatever
   stands at the seat's gates. Only a city with a hostile land unit
   within two tiles of its center trains regardless
   (`armyAtTheGatesV7`).
4. **One growth technology** (`armyWarGrowthDueV7`): at war a seat with
   the first two roles of its order unlocked and no population-building
   technology buys the one its land has the most use for; not a second.
   A seat at its unit limit with an enemy within three tiles of a center
   buys its next unit first.
5. **No economy technology in an assault** (`armyWarHoldsResearchV7`):
   while the army is engaged only the army's target (or that one growth
   technology) is a candidate, and Roads and Commerce are never the
   target. With every unit of the order unlocked the target is the next
   of Fieldcraft, Fortification, Metallurgy, and Explosives
   (`ARMY_LATE_RESEARCH_V7`), on the same clock.
6. A rich seat's clock runs faster, and that is all that separates it:
   its training already prefers the dear units its army is short of
   (`ARMY_DEAR_UNIT_VALUE_V7`, round 7).

### Real numbers at a held city

- **No lone attack from a holding force** (`armyGatedV7`): a unit of a
  position with mode `NONE` that holds a hostile city is treated as staged
  outside its own territory: no Move into the enemy's reach, no
  move-and-kill, and it is no hunter.
- **A raid goes to a city with no hostile unit within two tiles**
  (`CAMPAIGN_RAID_CLEAR_RADIUS_V7`; one tile before).
- **A front is sized against the holders with their cover**: the hostile
  units within four tiles of the city (`CAMPAIGN_FRONT_SIZE_RADIUS_V7`),
  each weighed with the cover it stands in and with Walls
  (`holdStrength`), times 150% (`CAMPAIGN_FRONT_NEED_RATIO_V7`, 200% of
  the plain weight before). Against Walls, or a ranged or siege unit among
  the holders, a third of the group is ranged or siege units
  (`CAMPAIGN_FRONT_SHOOTER_SHARE_V7`): the nearest ones replace the units
  that would have walked farthest.
- **Massed before it commits** (`ARMY_MASSED_RANKS_V7`): a position that
  has the weight still stages until half of the units coming at it stand
  within one tile of its foremost rank, unless the battle is joined, an own
  unit is in contact or under fire, or the enemy is on the move. The gap
  is measured as it was at the start of the turn, so a position does not
  flip in mid-turn.
- **Reinforcements rally** out of the enemy's reach and go in with the
  position (round 6's rally rule, which now exempts units with a job of
  their own: scouts, village errands, raids).
- **Siege units are targets.** A hostile siege unit is worth 15 more
  (`ARMY_SIEGE_TARGET_VALUE_V7`) to a fast, ranged, or siege unit, and
  siege units count among the fragile units the hunters go for.

### Goblin seats

- **Scouts.** Before contact an army seat below three cities sends every
  free capturer at its own stretch of frontier; after contact it keeps
  two scouts (`CAMPAIGN_SCOUTS_EXPANDING_V7`), and a capturer with no route
  to any known city explores. A seat whose naval plan sails keeps the
  round-7 behavior (its second unit is for the Port).
- **Bombs first.** A committed Bomb Chucker's Move to a firing tile and
  its throw (1187, 1188) go before every other Move of the assault, while
  no own unit stands beside the target; a Goblin Bomb Chucker's approach
  is worth 3 more.
- **Kaboom on a cluster.** A blast that hits three hostile units and no
  own unit goes at 1181, with or without a kill.
- **WAAAGH!** is called when two units in its radius have an attack this
  turn (`waaaghAttacksV7`), not merely an enemy in reach.
- **A spent fast unit pulls back** (`armySpentV7`): a unit of the
  breakthrough class with Move 2 or more, at half HP or less, without
  Lifesteal and without a kill on offer, moves to a tile out of the
  enemy's reach (937) before it considers a hit that does not kill (905).

### Small seats

- **The capital grows too**: growth in the seat's first capital is worth
  3 more while it is at level 2 or below, or below another own city
  (`armyCapitalGrowthV7`).
- **The best defender stays** on a threatened center: the unit steps
  aside for training only when the seat can train a garrison at least as
  good now (`armyGarrisonYieldsV7`), and training onto a threatened empty
  center prefers the better garrison (`ARMY_GARRISON_TRAINING_VALUE_V7`).
- **Lost anyway.** A unit the visible enemies can kill where it stands
  attacks a unit beside it whatever the exchange (`armyLostAnywayV7`).
- The counterattack at home is the commit rule of round 7; nothing was
  changed for it.

### The correction pass

Four hand-played games on this section as first written
([section 15.11](../product/RULESET_7_TUNING_HUMAN.md#1511-the-correction-pass))
changed the following; the research rules above are stated as corrected.

- **The battery** (`armyBatteryOverV7`, `armyCenterDeadlyV7`,
  `armyBatteryTargetV7`). The hostile siege units whose range covers a
  hostile center are its battery. A center is deadly for a unit when a
  battery covers it, the visible enemies kill the unit there before its
  next turn, and an own fighting unit stands within
  `ARMY_BATTERY_REACH_V7` (7) tiles of a unit of the battery. No unit
  Moves onto a deadly center or kills its way onto it (a filter). For a
  center the seat storms, the units within seven tiles go for the nearest
  unit of its battery instead (764, `ARMY_BATTERY_PRIORITY_V7`; one above
  the endgame's approach where that moves the unit): a siege or ranged
  unit always (to its own range), any other unit when the center is deadly
  for it; a fast unit only to a tile with an own unit beside it. A fast
  unit's Move that kills a siege unit is a breakthrough Move (1177)
  whatever the mode of its position, and is not held with the fast units.
- **A weak garrison** (`armyWeakGarrisonV7`): a hostile unit at half its
  HP or less on the center of a city without Walls, with two own fighting
  units within three tiles. It is a hunt target, the Move that attacks it
  is a committed one, and the attack is accepted and scored as a
  committed one, whatever the position weighs.
- **Bombers** (the Goblin Bomb Chucker; `armyBomberCrowdV7`,
  `armyHelplessGarrisonV7`). A bomber that moves and throws takes the
  Move to a tile with a throw whatever the mode (1187 committed, 1175
  otherwise), from its own land whatever comes back, elsewhere when it
  lives. Its end tile costs 30 for every hostile melee unit beside it and
  12 for every other own bomber. A role that cannot attack a neighbour is
  not trained onto a contested center (a hostile melee unit within two
  tiles) while another role can be, and counts a quarter as a garrison.
- **The frontier at home** (`CAMPAIGN_EARLY_ROUNDS_V7`,
  `CAMPAIGN_HOME_FRONTIER_RADIUS_V7`): in its first ten rounds, and while
  it has fewer than three cities, an army seat's scouts take the
  unexplored land within four tiles of an own center before the frontier
  toward the enemy, up to three scouts. Not a seat with an active naval
  plan or with Shorecraft.
- **Small rules.** An army seat never disbands a unit next to an enemy
  unit or center. A garrison's hit that does not kill is made before the
  step aside that lets its city train when it is worth 30 or more
  (`ARMY_GARRISON_HIT_VALUE_V7`). The front gate (`armyGatedV7`) does not
  apply to a seat whose naval plan is active: a landed unit acts.

### Cost

No new cache was needed. Nothing draws from the PRNG or depends on elapsed
time.

| Run (development machine)                                                                      | Round 7                               | Round 8                                |
| ---------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| The three labs (revision 2), three scripts, per decision                                       | 6.7 to 9.6 ms, slowest 104 ms         | 5.6 to 8.0 ms, slowest 71 ms           |
| 20 x 20, six seats, 30 rounds: per AI turn                                                     | mean 169 ms, p95 1.0 s, slowest 2.7 s | mean 149 ms, p95 0.92 s, slowest 2.3 s |
| The same match: per decision                                                                   | mean 8.6 ms                           | mean 8.6 ms                            |
| 25 x 25, eight seats, 30 rounds: per AI turn (measured one correction before the final source) | (24 rounds) mean 148 ms, p95 0.47 s   | mean 230 ms, p95 0.83 s, slowest 2.9 s |

(The budget of `pulp_wars-ykw.4` is a mean of 1.5 s and a p95 of 5 s per AI
turn. The matches differ between the two policies.)

### What it does not do

- A Goblin army still closes in with its fast and its cheap units ahead
  of its Bomb Chuckers; only the throw is ordered first. Two formations
  that put the shooters in front were tried and both lost the labs a
  round or more.
- A siege unit answers only a battery over a center the seat storms
  (the correction pass above); elsewhere it prefers a siege unit as a
  target when it has the shot.
- A Rocket Cart leapfrogs no better than in round 7.
- An army without Engineering does not research it because the enemy
  stands on Mountains. In one diagnostic match an Undead seat needed 18 rounds to take a city behind a belt of Mountains at two or three to one, and took it the round after Engineering came up on its clock
  (section 15.6 of the tuning document).
- The clock counts technologies owned, not their kind: a seat that
  researched economy early is "ahead" and waits.

## Revision-11 bounded tactical policy (current under revision 12)

The production policy consumes only the legal public schema, commands, and
previews under `pulp-wars-poc-7r48`. Role facts resolve through the unit's
kind (`unitFactionV7`: its owner's faction registration, or its original
owner's while it is mind-controlled,
[Mind Control revision](../product/RULESET_7_MIND_CONTROL.md)); the revision-13 Undead tactics, the revision-14
Plague, Bitten, Tend-cure, and Vampire play, the revision-15 Plague
duration valuation, the endgame siege mode (`pulp_wars-1mc`), the
revision-17 Goblin play (`pulp_wars-0ao.6`), and the revision-18 movement
estimates (`pulp_wars-6gd.2`) are summarized below. The revision-19
Dinosaur play (`pulp_wars-c87.5`, `src/ai/v7-dinosaur.ts`) is
[summarized below](#revision-19-dinosaur-play-pulp_wars-c875): Eggs, nest
tiles, Egg protection, Hatch, Grow, the Triceratops's Charge! (revision 20,
`pulp_wars-0hi.2`; the revision-19 Stampede and its lanes are removed), and
play against each of them. It is gated on a match with a Dinosaur seat, so
matches without one decide as under revision 18, except that a wounded unit
that can be promoted is promoted first (revision 20: a Promotion fully
heals). The Martian play (`pulp_wars-t6s.3`, `src/ai/v7-martian.ts`) is
[summarized below](#martian-play-pulp_wars-t6s3): Shields, heat rays and
Cooling, Pierce, Beam Down, Mind Control and controlled units (the
[Mind Control play](#mind-control-play-pulp_wars-b5f3) of `pulp_wars-b5f.3`),
the Tractor Beam, production and research, and play against each of them;
it is gated on a match with a Martian seat, and matches without one are
byte-identical.
The Ice Folk play (`pulp_wars-7g3.4`, `src/ai/v7-ice-folk.ts`) is
[summarized below](#ice-folk-play-pulp_wars-7g34): the Witch, Cold Snap,
the Bolas, the order of the attacks around Shatter, Sweep, the Boulder
Yeti, the Sabretooth, production and research, and play against each of
them; it is gated on a match with an Ice Folk seat, and matches without one
are byte-identical.
The Steampunk Dwarf play (`pulp_wars-78i.4`, `src/ai/v7-dwarf.ts`) is
[summarized below](#dwarf-play-pulp_wars-78i4): the Mole's tunnels and
riders, the Gyrocopter's bombing runs, the Gunner's two shots, the
Engineer's Assemble and Repair, Dig In, the Steam Cannon's Knockback,
production and research, and play against each of them; it is gated on a
match with a Dwarf seat (and a switch for the head-to-head tests), and
matches without one are byte-identical.
The Candy play (`pulp_wars-jdb.4`, `src/ai/v7-candy.ts`) is
[summarized below](#candy-play-pulp_wars-jdb4): the planned Sugar Rush, the
retreat of a Crashed unit, Re-bake before training, the Pie Launcher's shot
before the melee, Sugar Toss, production and research, and play against the
Crash, Crumbs, and Bounce; it is gated on a match with a Candy seat (and a
switch per group for the head-to-head tests), and matches without one
decide as before. The Candy engine step (`pulp_wars-jdb.3`) added the
`SUGAR_RUSH`, `REBAKE`, and `SUGAR_TOSS` command kinds, which move every
later kind's ordinal by three; that changes only the `-ordinal` tie-break
value of the pinned decisions (their revision-12-ordinal hashes are
unchanged).
The naval branch (`pulp_wars-5ti.2` and `pulp_wars-5ti.3`,
`pulp-wars-poc-7r43` and `7r44`) has no play of its own yet: the policy
stays legal with it and uses none of it on purpose
([summarized below](#the-naval-branch-pulp_wars-5ti2-and-5ti3)).
The campaign plan (`pulp_wars-9s0.1`, `src/ai/v7-campaign.ts`) is
[summarized below](#campaign-expansion-exploration-and-standing-pressure-pulp_wars-9s01):
every land unit has one job (a village, an invader, the frontier, or a known
enemy city) and walks the land route to it, in every match. The second pass
(`pulp_wars-9s0.8`) is
[summarized below](#second-pass-savings-hunts-and-sieges-pulp_wars-9s08):
savings for the Chivalry-tier unit and Chivalry, Spitters, hunts of
high-value units, sieges of a defended center, the Tractor Beam, and the
Mammoth. The siege of a single-file front (`pulp_wars-68k.6`,
`src/ai/v7-chokepoint.ts`) is
[summarized below](#siege-of-a-single-file-front-pulp_wars-68k6): where the
only land route to the nearest enemy city is a one-tile corridor under a
fortified position, one melee unit holds its head, the siege units fire
from tiles that do not block the lane, all fire goes to one defender, and
the seat commits at odds it otherwise refuses once the defender is wounded
or its own Coins pile up; a board without such a front decides as before.
Revision 12 adds a free opening research
choice (`src/ai/v7-opening.ts`: a deterministic score of the explored tiles
within Chebyshev 2 of the original capital, researched first on the opening
turn) and Raider Escape handling (an escape Move is used only toward a
strictly safer visible tile while visible enemies threaten the Raider); see
[current rules §16](../product/RULESET_7_CURRENT.md#16-normal-ai-summary).
Revision 16 ([section 3.6](../product/RULESET_7_REVISION_16.md#36-normal-ai-opening),
`pulp_wars-wwc`, every faction) puts growth first: when offered Gathering,
Hunting, or Shorecraft unlocks at least two visible growth resources (Fruit,
Game, Fish) in the original capital's own territory, the free opener is the
one with the most (ties by technology order; reported score 1000 + count),
otherwise the revision-12 scores apply. While that capital is level 1, a
ready growth harvest in its territory scores at least priority 1212 and
research, training, and construction (`BUILD_*`) that would score at or above
it drop to 1211; the naval Coin reserve never filters such a harvest. Attacks,
captures, Rally, Tend, and movement keep their priorities. With maps that
guarantee two growth resources of one kind (revision 16 §3), every Normal
capital of seeds 0–19 of every 1v1 11/14 cell (Human mirror and both mixed
orders) reached level 2 on its owner's first turn. It does not read an
opponent's private research, economy, unexplored terrain, or authoritative
state. Enemy threat reach resets the enemy's activation for its next turn;
friendly replacements and screens use their current activation. Known terrain,
occupancy, range, minimum range, move-then-primary limits, ZOC projection,
unit form, and capture timing determine whether a city is actually threatened.

The tactical context reserves distinct useful city approaches, keeps a sole
effective defender on a threatened center unless a current legal replacement
can take over, and rejects harmful attacks unless the public projection proves
a city save, a lethal follow-up/capture line, or greater realized target loss
than the sacrificed unit. Catapults require a reachable land-form screen;
Guards prefer defense; Knights and Raiders value flanks and capture openings;
Captains compare Rally and Tend; wounded units compare recovery and owned
Windmill staging. Shared land training, every assigned naval dock, and Land
Grant compete as one city action after reserve, capacity, and displacement
eligibility are applied. Existing Ports and Shipyards are not torn down for a
coastal rebuild; Shipyard uses its direct upgrade command.

Normal also preserves established Windmills, Sawmills, Forges, Workshops,
Markets, and Monuments. Public one-step planning intentionally ignores current
technology, Coin, and offer gates, so it cannot safely justify demolishing a
one-per-city building for an immediate replacement. The policy may still
Redevelop a Farm, Lumber Camp, or Mine when the public plan identifies a useful
different result that the seat can build now (see
[the Redevelop and rebuild cycle](#the-redevelop-and-rebuild-cycle-pulp_wars-9s09)).
This policy limitation does not change Redevelop legality: Normal does not
relocate established one-per-city buildings.

Road planning selects one public original-capital-to-city corridor with at most
eight missing Roads and builds the next tile from the connected side. Target
utility includes the two live-Population endpoints, the public Commerce land
trade Coin when researched, published city/Market income, and a conservative
movement-shortening proxy: twice the unroaded direct distance minus completed
corridor length, floored at zero. This proxy decreases for detours; it is not an
exact marginal travel-time simulation. A disconnected or scattered Road is not
a productive candidate.

`NormalPolicyWorkV7.advanceWork(n)` exposes exact deterministic work units.
Budget one advances one command/planning operation, path expansion,
unit/objective comparison, or candidate score step. `runSlice(milliseconds)`
retains the browser wall-time yield API, but elapsed time never enters scores,
ordering, or ties. After public command generation, the work object prepares
an exact per-decision lookup context, then naval, hostile-threat, and tactical
facts before spatial planning. The lookup context indexes public cities,
units, stats, and actual MOVE destinations and memoizes combat facts and reveal
checks only for that immutable view. Projected views and transformed unit
objects fall back to their own public data. Its record-by-record preparation is
charged to the same deterministic work budget. The policy omits
only commands that those facts prove the policy will reject unconditionally:
Roads outside the next canonical corridor tile and Redevelopment of the
established buildings listed above. Base economic potentials are still fully
prepared, every potentially scored command is planned, and scoring retains the
original ready-command order. Diagnostics publish offered and planned
candidate counts, total-work, phase-work,
naval/threat/Road path expansion, and replacement-path validation counts with
finite ceilings derived from public cells, units, objectives, candidates, and
the eight-Road limit. Construction and final sorting are bounded setup/finish
overhead outside the score and never depend on elapsed time.

The validation harness separately keeps a one-entry public metric cache. It
reuses a post-command view and threat set only when the next metric request has
the identical frozen state object and actor. This avoids duplicate validation
work without changing production policy work, commands, or metric definitions.

Public planning additionally reuses at most 24 completed stable-fact entries
across reconstructed equal views. Its collision-free public key covers every
planning dependency, and hits still scan current facts and reconstruct current
candidate objects incrementally. Diagnostics therefore report physical work:
a warm equal-view decision can use fewer operations than its cold counterpart
while returning the same potentials, scores, ordered tuple, and command. The
cache boundary and exact key are documented in
[Ruleset 7 public planning work](PUBLIC_PLANNING_V7.md).

The same-rules validation baseline remains commit
`2a3c029f92a63ea33c7164b05ad0a91d134c1e7b`, whose `src/ai/v7.ts` SHA-256 is
`37c5cebe79cc30939a8a7ce15ab0b83cfac6a6a220add8f57f85f6a2e1d72e73`.
The validation loader reconstructs that source only for tests and benchmarks;
historical policy code is not shipped in production. Current commands,
evidence, caps, and limitations are documented in
[Ruleset 7 tactical AI validation](../validation/RULESET_7_TACTICAL_AI.md).

The older merged-industry policy notes below are retained implementation
history and do not override the
[current Human technology graph](../product/RULESET_7_CURRENT.md#62-technology-tree)
or the revision-11 AI contract.

## Campaign: expansion, exploration, and standing pressure (`pulp_wars-9s0.1`)

A playtest found the policy passive: it sent a unit or two, lost them, and
left the player alone for ten turns; it fought a neighbour next door and
stayed out across any gap. Measurement
([the telemetry](HEADLESS_SIMULATION.md#normal-ai-pressure-telemetry-pulp_wars-9s01),
results [below](#measurements)) traced that to movement and targeting, not
to spending:

- every unit moved greedily by Chebyshev distance
  (`tacticalMovementObjectiveValueV7`, `movementObjectiveValue`), so it
  stopped in front of a lake or a mountain range with the objective beyond
  it; with no objective, every unit walked to the same nearest unexplored
  tile, and a seat with sixteen units had not found an enemy nine tiles
  away by round 30;
- each unit took the objective with the best `30 − 4 × distance` score
  (`tacticalPlanWorkV7`), so with two enemies every unit went for the nearer
  one, and a seat whose nearest known enemy city was nine or more tiles away
  had units at that front on a tenth of its turns;
- a Raider within two tiles of the seat's richest city outranked any march
  (`scoutPicketValue`, priority 710 over 700), so Raiders, the fast units,
  circled home all game;
- a visible enemy boat or one own transport made the naval plan active
  (`navalPlanWorkV7`), which drew every land capturer to the Ports (820 and
  1300 over 700); a transport with no way forward waited at sea for the
  rest of the match and kept the plan active, and Patrol Boats filled the
  unit slots;
- units around a besieged own city did not engage: all of them held the
  city as their objective and stood next to it;
- units left as soon as they were trained, one at a time.

The enemy was never forgotten: a city on an explored tile stays in the view
for the rest of the match. Spending was not the cause either: from round 1
about a fifth of the Coins spent go to units, the bank stays near zero until
round 30, and a freed unit slot is refilled at once.

The policy now gives every own land unit one **job** per decision
(`src/ai/v7-campaign.ts`, built in `tacticalPlanWorkV7`) and follows the
breadth-first land route to it over explored, enterable tiles (units are
not walls; Mountains need Engineering; allied territory is closed). A unit
with no route keeps the old straight-line objective, and the naval plan
keeps the units with no job on land. Everything reads the public view only:
explored tiles and their territory owner, cities on explored tiles, visible
units, treasure chests, own Ports, and the seat's own free unit slots. It
adds no PRNG use, no elapsed-time input, and no work units (at most a few
dozen searches per decision, inside the tactical step).

Units that keep their old objective: the unit on an own city center while a
hostile land unit is visible within three tiles (the garrison), and a
defender-role unit whose objective is a threatened own city (it still takes
the defence job below when an invader is in reach). Every other land unit
takes the first job that applies:

1. **Scout** (while no enemy city is known). The first scout goes before
   anything else, to the nearest explored land tile next to an unexplored
   one, first among those within three tiles of enemy territory whose city
   has not been seen or of a visible enemy unit.
2. **Expansion.** Each explored, unclaimed village gets the nearest
   capture-capable unit by route, then each treasure chest a capturer
   within six route steps. A capturer on its way to a village is not called
   back.
3. **Defence.** Each visible hostile land unit within two tiles of an own
   city center is engaged by attack-capable units within six route steps:
   up to three while no enemy city is known, one once there is a city to
   march on (the others counterattack).
4. **Exploration.** Before contact a second scout takes a stretch of
   frontier at least four tiles from the first, and the other capturers
   follow the first scout, so what it finds meets a group. After contact
   one scout keeps exploring. A scout is the fastest capturer, then the
   oldest.
5. **Pressure.** Every other unit marches on its nearest known enemy city by
   route (City Walls count as two extra steps). With several hostile seats
   in reach, each seat gets at least a pair of units, as far as the army
   goes round, taken from the seat with the most. A known city stays a
   target for as long as it is hostile, whatever was lost there. Where the
   naval plan's sea route to its target is more than three steps shorter
   than the walk, the capturers bound for that target get no job on land
   and sail, as before.

**Waves.** A unit within two tiles of an own city center (home) does not
leave the home zone until three units for its target are home; fewer when
the seat has no free unit slot left to train them, and only the target with
the most units waits for new ones. It leaves at once when two or more units
for that target are already out, or when the target is within five route
steps of an own city (next door there is nothing to wait for). Units never
wait near the enemy: a staging ring three tiles from the target was
measured and dropped, because the defenders picked the waiting units off.

**Assault.** The endgame's combined attack on the defender of a city center
(this attack and the other offered attacks kill it, and a fresh capturer
stands next to the center) is allowed on every city the campaign marches
on, at the endgame's priorities 1344 and 1343.

**Military share.** While an enemy city is known and fewer than two thirds
of the seat's unit slots are filled, land production (`TRAIN`, `LAY_EGG`)
takes priority 1205: before every economic action except one that reaches a
city level (1210) and the opening growth harvest (1212), so losses at the
front are replaced first. Above that share it keeps priority 1080.

**Naval plan.** A unit with a job never boards and is not drawn to a Port.
An embarked unit is stranded when it has not moved, has no Move that makes
route progress or reveals a tile, has no planned landing on offer, and the
plan is not holding it off a target that an own or allied capturer is
taking. It lands (priority 810) on an offered tile from which a village or
a known enemy city can be walked to, and takes that job ashore. Beyond two owned naval
units the seat trains only the naval role its plan asks for, in every match
(the revision-14 rule for Undead matches). Since the naval branch engine
(`pulp_wars-5ti.2`, `7r43`) Submarines count among those naval units; the
plan never asks for one, and the policy does not yet use the Ram, Board, or
Submarines on purpose
([naval branch overlay, section 13.1](../product/RULESET_7_NAVAL_BRANCH.md#131-seafaring-seats-bead-5ti4),
`pulp_wars-5ti.4`). Since the frozen sea (`pulp_wars-5ti.3`, `7r44`) an Ice
Folk seat has no ships: it makes no naval plan, `FREEZE` is never a policy
candidate, and its units reach only what they can walk to (ice that exists
included). Every seat's threat estimate treats ice as ground for land units,
gives a slipping unit one tile of ice, and gives an icebound unit no threat;
it does not follow a slide
([naval branch overlay, sections 13.2 and 13.3](../product/RULESET_7_NAVAL_BRANCH.md#132-the-ice-folk-bead-5ti5),
`pulp_wars-5ti.5`). The plan still becomes active
only as before, so a seat with objectives on its own land does not start an
invasion across the water; see the limits below.

**Landing discipline** (`pulp_wars-ykw.7`). On the village-dense boards of
`pulp-wars-poc-7r40` a seat landed a whole army for two or three villages
and re-embarked the units that found nothing to do, and a unit could board,
be landed beside the tile it had left, and board again. Three rules, all
read from the public view:

- **A landmass takes no more landings than it has work.** When the plan's
  target is a neutral village on a landmass without a hostile city, and
  the viewer's and its allies' land capturers on that landmass are already
  as many as its known uncaptured villages, the plan holds its transports
  (as it does while a capturer stands on the target) instead of landing
  more.
- **A capturer that can walk to an endgame target does not board**: the
  endgame plan has a public land route from its tile.
- **The endgame lands a transport only by a real target city**: the
  landing tile's route (three steps at most) must end on a visible target
  city. While the endgame plan only searches (its routes end on unexplored
  tiles) a transport keeps exploring by sea.

The naval plan is inactive on Dry Land, so a Dry Land match plays exactly
as before (20 matches on 11 x 11 and 14 x 14 compared hash for hash).

Open (`pulp_wars-eru`, deferred): with the `7r41` economy a unit still boards, steps off one tile away, and re-boards on some Pangea and Lakes boards; `npm run validate:ruleset7-naval-playable` reports it as a warning there and fails on it only on Continents.

A Raider pickets its richest city only while a threat to an own city is
visible, and a screen does not step back from its job to stand next to a
ranged unit.

### Measurements

Before is main `a158cfd` (`pulp-wars-poc-7r21`), after is this change; both
ran the same seeds with the telemetry script (Rival, Normal, auto board
sizes unless stated). The **turtle** sets put a defender that never leaves
home on seat 0 (`--turtle`); its view counts hostile land units in or next
to its territory at the end of each of its turns.

```bash
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --turtle --pairings HH,HU,HG,HD --sizes 14 --seeds 3 --max-rounds 80
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --turtle --pairings HH,HU,HG,HD --sizes 20 --seeds 1 --max-rounds 80
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --turtle --pairings HUGD,HDGU,HGUD --seeds 3 --max-rounds 80
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --pairings HU,UH,UU,HH,GH,HG,GU,UG,GG,DH,HD,DU,UD,DG,GD,DD --seeds 3
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --pairings HUGD,DHUG,GDHU,UGDH --seeds 2 --max-rounds 120
```

The turtle's view (pressed: turns with at least that many hostile units at
its border, from the first such turn on; calm: its longest run of turns
with none):

| Set                 | Policy | Matches | First pressed (never) | Pressed 1+ |    2+ | Longest calm, median / p90 | Calm runs of 5+ per match | Turtle defeated | Round cap |
| ------------------- | ------ | ------: | --------------------- | ---------: | ----: | -------------------------- | ------------------------: | --------------: | --------: |
| 1v1, 14 x 14        | before |      60 | round 20.5 (2)        |      50.4% | 31.5% | 2 / 46                     |                      0.55 |              40 |     23.3% |
| 1v1, 14 x 14        | after  |      60 | round 18 (1)          |      62.2% | 37.2% | 2 / 18                     |                      0.43 |              41 |     15.0% |
| 1v1, 20 x 20        | before |      20 | round 16 (5)          |      57.0% | 37.1% | 4 / 29                     |                      0.80 |               5 |     65.0% |
| 1v1, 20 x 20        | after  |      20 | round 24 (0)          |      73.5% | 58.7% | 1.5 / 34                   |                      0.25 |               8 |     45.0% |
| Four seats, 16 x 16 | before |      45 | round 14 (3)          |      53.2% | 34.6% | 4 / 34                     |                      0.80 |              25 |     44.4% |
| Four seats, 16 x 16 | after  |      45 | round 14 (1)          |      62.3% | 43.1% | 2 / 32                     |                      0.56 |              32 |     28.9% |

The AI seats (front: turns after first contact with at least one own land
unit in or next to enemy territory; free: the turns with no hostile land
unit within two tiles of an own city):

| Set                         | Policy | Seats | First siege (never) | Front 1+ | Free front 1+ | Longest quiet, median / p90 | Free quiet of 4+ (seats) | Front at gap 6-8 | at gap 9+ |
| --------------------------- | ------ | ----: | ------------------- | -------: | ------------: | --------------------------- | -----------------------: | ---------------: | --------: |
| Turtle 1v1, 14 x 14         | before |    60 | round 28 (11)       |    61.9% |         73.4% | 2 / 26                      |                    21.7% |            86.3% |         - |
| Turtle 1v1, 14 x 14         | after  |    60 | round 28 (9)        |    68.7% |         79.5% | 2 / 15                      |                    18.3% |            93.8% |      100% |
| Turtle 1v1, 20 x 20         | before |    20 | round 32 (3)        |    74.3% |         76.9% | 3 / 51                      |                    30.0% |            94.9% |         - |
| Turtle 1v1, 20 x 20         | after  |    20 | round 29.5 (0)      |    93.8% |         95.0% | 2 / 5                       |                     5.0% |            96.7% |         - |
| Turtle four seats           | before |   135 | round 15.5 (31)     |    70.0% |         67.8% | 4 / 15                      |                    30.4% |            58.0% |      9.2% |
| Turtle four seats           | after  |   135 | round 15 (32)       |    70.5% |         71.4% | 3 / 11                      |                    23.7% |            61.2% |     56.3% |
| AI v AI 1v1, 11 and 14      | before |   960 | round 19 (258)      |    67.6% |         79.4% | 3 / 11                      |                    16.6% |            72.8% |     66.4% |
| AI v AI 1v1, 11 and 14      | after  |   960 | round 17 (264)      |    68.3% |         77.3% | 3 / 9                       |                    15.0% |            70.3% |     55.0% |
| AI v AI four seats, 16 x 16 | before |   160 | round 17.5 (28)     |    70.1% |         68.7% | 5 / 16                      |                    35.6% |            62.0% |     11.0% |
| AI v AI four seats, 16 x 16 | after  |   160 | round 14 (38)       |    75.3% |         79.6% | 4 / 10                      |                    21.3% |            69.0% |     64.9% |

Matches (no errors or stalls in any set):

| Set                         | Policy | Matches | Median rounds | p90 | Round cap |
| --------------------------- | ------ | ------: | ------------: | --: | --------: |
| AI v AI 1v1, 11 and 14      | before |     480 |            29 |  51 |      1.3% |
| AI v AI 1v1, 11 and 14      | after  |     480 |            29 |  49 |      2.1% |
| AI v AI four seats, 16 x 16 | before |      40 |            53 | 121 |     32.5% |
| AI v AI four seats, 16 x 16 | after  |      40 |            46 | 121 |     17.5% |

Win rates over the decided mixed 1v1 games (final balance is
`pulp_wars-0hi.3`): Human 44.4% before, 36.0% after; Undead 58.2%, 50.0%;
Goblin 46.4%, 48.0%; Dinosaur 51.1%, 66.1%. Dinosaurs gain against every
other faction (against Humans 58.3% to 71.2%, Undead 46.6% to 67.8%,
Goblins 48.3% to 59.3%).

Spending did not move much: of the Coins spent in rounds 1-10, 11-20, and
21-30 units take 21.6%, 25.4%, and 23.6% (before: 20.1%, 24.8%, 22.6%);
research takes about 40% and the economy about a third. Armies are the same
size (median 5, 7, 7 units in rounds 10, 15, 20). Embarked units that did
not move fell from 5.8% to 2.1% of unit-turns (9.8% to 3.9% with four
seats), and idle units at home from 9.4% to 4.5%.

Cost: on the retained late view
(`npx tsx scripts/benchmark-ruleset-v7-normal-policy.ts`, three runs each on
the development machine) the sliced decision takes 16.4 to 17.6 ms (before
15.4 to 17.7 ms) and the synchronous one 2.6 to 3.2 ms (2.4 to 3.0 ms); the
largest 8 ms slice is 8.2 ms and none exceeds 16 ms.

Limits measured after the change:

- **Close starts.** With the capitals seven or eight tiles apart (Pangea,
  14 x 14) the turtle is pressed on 47.5% of its turns (before 46.6%) and
  loses in 3 of 12 games (5 of 12). When the nearest enemy city is four or
  five tiles from an own city, the seat has a unit at the enemy border on
  half of its turns (50.7%, before 43.8%), against 92% or more at every
  other distance. At that range an enemy unit stands within two tiles of
  one of the seat's cities on 58% of its turns (8% at a gap of six to
  eight), and its units fight there; on its other turns it is at the enemy
  border 73% of the time (before 62%).
- **Water.** A seat with any objective on its own land still does not start
  an invasion across the water (the naval plan becomes active as before).
  On Continents with four seats the turtle is pressed on 42.6% of its turns
  (47.9%), and on the 20 x 20 Archipelago on 16.6% (43.1%, four games).
- **Units and Coins.** The military share of spending is unchanged, and the
  policy still buys the cheapest unit that fits as soon as a slot frees: it
  never saves for an expensive unit or a technology.
- **After a lost front** the seat is back within two turns at the median
  (p90 5, before 7), but in a third of the AI-v-AI cases it never comes back
  before the match ends (341 of 1,584; before 326 of 1,544). Most of those
  seats are losing the match.

## Second pass: savings, hunts, and sieges (`pulp_wars-9s0.8`)

The [campaign](#campaign-expansion-exploration-and-standing-pressure-pulp_wars-9s01)
left the limits listed above, and the Martian and Ice Folk balance passes
added three more. This pass adds the rules below. Like the campaign they read
only the public view and public previews, add no PRNG use, no elapsed-time
input, and no work units. The savings plan and the siege apply in every
match; the other rules need the unit or faction they name.

Every candidate rule was measured head to head against the policy before
this pass (main `edf0d1d`): the same seeds in both seat orders, on Dry Land
unless stated, with every other new rule switched off. A rule was kept only
when it won, or was neutral and moved the measured problem; four were
dropped (below).

**Savings** (every faction). The policy spent every Coin the moment it had
it, and its production value (HP minus twice the cost) rated the
Chivalry-tier unit at or below zero, so Knights, Scrap Buggies, and T-Rex
Eggs were never produced. While the seat is at war, no own city is
threatened, and it fields at least three attack-capable land units, it now
has one savings goal: the Chivalry-tier unit (the `KNIGHT` role) once
researched, while it has fewer than two of them and an own city has the
slots; otherwise Chivalry itself once its prerequisites are researched. The
goal must be affordable now or within two turns of the public city income.
An affordable goal is bought first (priority 1206, above the economy and the
at-war training at 1205; level-ups at 1210 stay first), and the goal unit
wins its city's production choice without the per-Coin penalty (it is
valued at its HP plus 30). An unaffordable goal holds: other land and naval
training waits (except in a threatened city, or a Patrol Boat against
visible naval danger), and research or construction that would leave fewer
Coins than the goal costs waits (never a city level-up or the opening growth
harvest). A Dinosaur seat at war also gains a Spitter bias (+16) while it
has fewer than two Spitters (Acid ignores cover and fortification).

**Hunt** (against a Witch, Brain, Necromancer, or Projector). The kill and
focus rules ranked only attacks already on offer. A visible hostile land unit
with Blizzard, Cold Snap, Mind Control, Raise Dead, or Force Field is now
hunted when up to five own units that can hit it this turn (an offered
attack, or a Move into its attack band by a ready unit that may attack after
moving, one unit per tile) project at least its HP between them, each hit
projected from the tile it is made from (Snow cover and the Blizzard halving
of a shot included) on the HP the earlier hits leave. A hunter's Move into
the band goes at 1177 (above the routine Moves, exempt from the Cold Snap
reach and sluggish rules, the safest tile first), its attack at 1178 (a kill
at 1182), and it is never filtered as a low-value attack.

**Siege** (every faction). Many losing seats never captured a city: the
combined attack on a center's defender counted only the attacks already in
reach. The defender on the center of a city the campaign marches on (or an
endgame target) is now hunted the same way, while a capturer can take the
cleared center: a capture-capable unit within two tiles that has not moved
and is not a hunter, or a melee hunter that can capture (a melee kill
advances onto the center).

**Tractor Beam and Mammoth.** The Tractor Beam gains two pulls at 1150: a
hostile unit pulled where the army's other attacks (not the Mothership's
own) take at least half of its HP and Shield, and a hostile land unit
pulled away from an own city center it stands next to. A ready Mammoth gains 4 per flank victim for a Move to a
tile where its Sweep hits a flank, and with no flank hit on offer where it
stands such a Move goes at 905, above the chips, outside visible lethal
reach.

### Second-pass measurements

Head to head, new rules against the policy before (decided games):

| Rule                                       | Set                                                          | Games | New wins   | What moved                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------ | ----: | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Savings (unit, Chivalry, Spitter)          | six mirrors, 14 and 16, 8 seeds                              |   189 | 95 (50.3%) | Chivalry-tier units trained in 54 of 192 new seat-games (base 10 of 192): Knights 53 (0), Vampires 77 (33), T-Rex Eggs 38 (0), Scrap Buggies 12 (0), Motherships 30 (14); Spitter Eggs 39 in 14 seat-games (7 in 6); military share of spending 16.4% (13.4%) for Humans, 22.2% (20.1%) for Undead |
| Hunt                                       | Ice, Martian, Undead mirrors and four mixed pairs, 11 and 14 |   144 | 71 (49.3%) | High-value kills 61 (base 56): Projectors 23 (20), Brains 4 (3), Witches 14 (13)                                                                                                                                                                                                                   |
| Siege                                      | six mirrors, 11 and 14, 5 seeds                              |   120 | 68 (56.7%) | city captures 199 (165); seat-games with a capture 79 (69)                                                                                                                                                                                                                                         |
| Brain stalk, Tractor Beam, Mammoth         | Ice and Martian mirrors and mixed pairs, 14 and 16           |   127 | 64 (50.4%) | Mind Control in 11 of 26 Brain seat-games (10 of 26), Tractor Beam in 7 of 11 Mothership seat-games (5 of 11), a flank hit in 13 of 21 Mammoth seat-games (12 of 21)                                                                                                                               |
| All kept rules                             | six mirrors, 11 and 14, seeds 0-4                            |   119 | 66 (55.5%) |                                                                                                                                                                                                                                                                                                    |
| All kept rules                             | six mirrors, 14 and 16, seeds 5-9                            |   117 | 59 (50.4%) |                                                                                                                                                                                                                                                                                                    |
| All kept rules                             | six mirrors, Pangea 14                                       |    48 | 25 (52.1%) |                                                                                                                                                                                                                                                                                                    |
| All kept rules, after the Rift (`d8ed16d`) | six mirrors, 11 and 14, seeds 0-4                            |   119 | 66 (55.5%) |                                                                                                                                                                                                                                                                                                    |
| All kept rules, after the Rift (`d8ed16d`) | six mirrors, 14 and 16, seeds 5-9                            |   118 | 61 (51.7%) |                                                                                                                                                                                                                                                                                                    |

Together the kept rules won 125 of 236 decided Dry Land games (53.0%)
before the Rift landed (the six mirrors at 14 and 16 and on Pangea were
measured with the Brain stalk, which only changes Martian games; the Martian
mirrors were re-run without it), and 127 of 237 (53.6%) after it (the
Martian mirrors and the Martian balance pairings re-run with the final
Tractor Beam rule gave the same results).
Seat-games with a city capture rose to 143 of 240 (129), and the
Chivalry-tier unit was trained in 51 of 240 new seat-games (11 of 240). In
the post-Rift games a decision took 13.0 ms at the mean (12.0 ms before) on
the development machine with four matches running.

Dropped, measured and not kept:

- **A Brain stalk.** A ready Brain with no Mind Control target closed on
  the nearest weak hostile unit within six tiles (1101). Head to head it was
  neutral (in the table above with the Tractor Beam and Mammoth), but Mind
  Control was used in 17 of 50 Brain seat-games of the coarse balance run
  (34%) against 18 of 46 (39%) before: the weak units it stalked kept out of
  reach. Without it the rate is 18 of 50 (36%).
- **A close-in Move toward a high-value unit** (1096, within four tiles of a
  firing position): 64 of 143 (44.8%); the units walked into the enemy army
  (a Goblin seat lost all eight 14 x 14 games to Martians).
- **A contested-border push.** At a gap of four or five tiles the units are
  not held back: at the end of the turn most of the seat's units off the
  front have an attack job and moved that turn, two to four tiles from the
  target (a diagnostic of 12 Pangea 14 x 14 games). Two pushes were tried:
  a city that outnumbers the invaders near it by two sends its spare
  defenders out after the invaders have their responders, and no wave waits
  for a target within five tiles (Chebyshev) of an own city. Head to head
  57 of 120 (47.5%) on Dry Land and 24 of 48 on Pangea; at the 4-5 gap the
  turtle set's front share went from 57.1% to 55.6%. Neither moved the
  problem.
- **An overseas front.** Starting the naval plan when a known hostile city
  is overseas and no hostile city can be walked to (it waited for the last
  village), and a second front of two capturers by sea once the seat fields
  six: the 1v1 Continents and Archipelago games did not change at all (the
  plan was already active there), and on Continents with four seats the
  turtle was pressed on 44.0% of its turns against 50.8% before (its longest
  calm median 22 turns against 9): the capturers that sailed were missed at
  the land front.

Pressure telemetry, before (`edf0d1d`) and after the kept rules, with the
script of each tree:

```bash
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --turtle --pairings HH,HU,HG,HD --sizes 14 --seeds 3 --max-rounds 80
npx tsx scripts/ruleset7-ai-pressure-telemetry.ts --pairings HU,UH,HG,GH,HD,DH,HM,MH,HI,IH,UG,GU,DM,MD,IM,MI --maps dry-land --sizes 11,14 --seeds 2
```

| Set                             | Policy | Matches | Turtle pressed 1+ | Longest calm, median / p90 | Turtle defeated | Round cap |  Front at gap 4-5 | at gap 6-8 | Seats with a quiet run of 4+ |
| ------------------------------- | ------ | ------: | ----------------: | -------------------------- | --------------: | --------: | ----------------: | ---------: | ---------------------------: |
| Turtle 1v1, 14 x 14, five maps  | before |      60 |             61.8% | 1 / 15                     |              47 |     13.3% | 57.1% (604 turns) |      92.7% |                        31.7% |
| Turtle 1v1, 14 x 14, five maps  | after  |      60 |             69.6% | 1 / 15                     |              51 |      5.0% |       68.3% (417) |      91.5% |                        30.0% |
| AI v AI 1v1, Dry Land 11 and 14 | before |      64 |                 - | -                          |               - |        0% |                 - |      82.4% |                        39.1% |
| AI v AI 1v1, Dry Land 11 and 14 | after  |      64 |                 - | -                          |               - |        0% |                 - |      72.8% |                        36.7% |

The contested 4-5 tile gap, which neither push rule moved, improved with the
siege: the seat there is at the turtle's border on 68.3% of its turns
(57.1%), and the turtle falls in 51 of 60 games (47). Pangea 14 x 14 (the
close starts): the turtle is pressed on 68.4% of its turns (44.7%), its
longest calm run p90 is 8 turns (14), and it falls in 8 of 12 games both
times, in 20.5 rounds at the median (24); head to head on Pangea the kept
rules won 25 of 48.

The military share of spending (AI v AI, Dry Land) is 20.7%, 22.5%, 16.7%,
and 22.9% in rounds 1-10, 11-20, 21-30, and 31+ (before 20.7%, 21.7%,
15.3%, 17.1%); the mean bank at the end of a turn is 2.0 Coins (5.2). The
armies are smaller (median 5 units at round 20 and 6 at round 30, against 6
and 9): a Knight takes the Coins of three or four Fighters. On Dry Land the
share of turns with a unit at the front fell (66.1% against 70.7%; 72.8%
against 82.4% at a gap of six to eight), while the seats' longest quiet runs
did not change (median 2, p90 10 against 9).

Coarse balance (Dry Land, 11 and 14, six seeds per seat order: 24 games
per pair of factions; `scripts/ruleset7-undead-balance-matrix.ts --maps
dry-land --seeds 6` over the 30 mixed pairings), before and after, on the
`7r27` rules:

| Pair                | Before | After |
| ------------------- | ------ | ----- |
| Dinosaur v Martian  | 12-12  | 16-8  |
| Dinosaur v Goblin   | 11-13  | 14-10 |
| Dinosaur v Human    | 11-13  | 12-12 |
| Dinosaur v Undead   | 9-15   | 9-14  |
| Dinosaur v Ice Folk | 9-15   | 8-16  |
| Human v Ice Folk    | 10-14  | 8-16  |
| Human v Undead      | 9-15   | 10-14 |
| Human v Martian     | 12-12  | 12-12 |
| Goblin v Human      | 12-12  | 12-12 |
| Goblin v Ice Folk   | 10-14  | 9-15  |
| Goblin v Martian    | 10-14  | 11-13 |
| Goblin v Undead     | 9-15   | 11-13 |
| Ice Folk v Martian  | 12-12  | 15-9  |
| Ice Folk v Undead   | 15-9   | 15-9  |
| Martian v Undead    | 12-12  | 13-11 |

No pair moved past 70/30; Dinosaur over Martian (16-8) and Ice Folk over
Humans and Dinosaurs (16-8) are the widest. Ice Folk win 64.2% of their
mixed games (58.3% before), Dinosaurs 49.6% (43.3%), Martians 45.8%
(51.7%), Undead 51.3% (55.0%), Humans 45.0% (46.7%), Goblins 44.2% (45.0%).

The formerly missing units now appear (seat-games with one, of 120 per
faction): Knights in 14 (0), Vampires in 15 (3), Scrap Buggies in 14 (0),
T-Rex Eggs in 19 (0; against Humans, Undead, and Goblins an Egg in 13 of
72 seat-games and in 11 of the 13 that reached 35 rounds, before 0 of 18),
Motherships in 25 (22), Ice Folk Knights in 12 (10); Spitter Eggs were laid
41 times in 19 seat-games (13 in 9). The Tractor Beam was used in 13 of 23
Mothership seat-games of 35 or more rounds (6 of 18), Mind Control in 18 of
50 Brain seat-games (18 of 46), a Mammoth landed a flank hit in 55 of 96
Mammoth seat-games (50 of 97), and the Ice Witch was killed in 9 of 57 Witch
seat-games (9 of 56).

Cost: on the retained late view
(`npx tsx scripts/benchmark-ruleset-v7-normal-policy.ts`, three runs each)
the sliced decision takes 29.6 to 30.0 ms (main 29.4 to 30.9 ms) and the
synchronous one 4.7 to 5.9 ms (4.6 to 5.0 ms); the largest 8 ms slice is
9.4 ms (9.3 ms) and none exceeds 16 ms. The view's decision is unchanged.

## Revision-13 Undead play (`pulp_wars-vkq.9`)

Every Undead heuristic lives behind one gate: the match has an Undead seat
(`src/ai/v7-undead.ts`, `undeadMatchForPolicyV7`). An all-Human match never
evaluates any of it, and the new combat-preview fields (Lifesteal heal,
Infect flags) are always 0/false there, so all-Human decisions and pinned
decision hashes are unchanged. The helpers read only the public view, public
commands, and the public previews (`previewRaiseDeadV7`, `previewDevourV7`,
`previewWailV7`, `queryCombatPreviewV7`, and the view-only
`publicWailTargetsV7` for a hypothetical Banshee position). They add no PRNG
use, no elapsed-time input, and no work units: each is a bounded scan of the
view inside an existing scoring step.

As Undead:

- **Raise Dead** (priority 1237) when the preview lists Graves, valued 14
  per Skeleton. A Necromancer with a free action moves beside more open
  Graves than it has now (1238 for two or more, 1160 for one) only while its
  visible danger stays below its HP (half its HP for one Grave), otherwise
  drifts toward open Graves within 6 tiles. It never moves into lethal
  visible danger unless that is strictly safer than staying.
- **Frenzy** is scored only from adjacent attack-capable, non-support,
  non-siege units that have not attacked and can reach a visible enemy this
  turn (1235 for two or more, 1190 for one, never for none).
- **Devour** (1176) heals a Ghoul missing at least 3 HP or denies a Grave
  within 3 tiles of a hostile Necromancer; a smaller heal (640) is skipped
  when an own Necromancer is within 3 tiles (the Grave is worth raising). A
  wounded Ghoul moves onto an open Grave to Devour when it would survive.
- **Wail** sums the exact preview: 10 per damage, 20 per kill, 4 per Grave
  created, plus realized target value. Kills score 1250, two or more targets
  or at least 4 damage 1245, a chip 905, and a zero-damage Wail never. A
  Banshee moves first when a reachable tile's projected Wail is strictly
  better and its visible danger is below its HP (half its HP for a chip).
- **Lich** targets use the existing splash-inclusive combat values plus 4
  per splash kill that leaves a Grave; its idle-recovery estimate for Undead
  targets respects Restless. Any kill that leaves an unoccupied Grave within
  3 tiles of an own Necromancer gains 6.
- **Lifesteal and Infect**: combat immediate value adds 8 per HP healed and
  subtracts 10 per HP an enemy Vampire heals; an Infect rising is worth 22
  (a 10-HP Zombie) to the killer's side.
- **Restless**: a unit at half HP or less outside own territory scores 935 for a
  move into own territory, otherwise 720 plus progress toward its nearest own
  city. Recover is never planned outside own territory (the engine does not
  offer it).
- **Training**: Banshee +8 while a living hostile seat is active, −30
  otherwise (and no research toward it); Necromancer +4 per visible Grave (at
  most 3); Lich +4. The opening research keeps the revision-12 scorer and the
  revision-16 growth-first rules for every faction.

Against Undead (any seat in such a match):

- an attack whose retaliation kills and infects the attacker is rejected
  unless it proves a city save or a lethal follow-up; a melee chip that
  leaves the attacker inside the wounded Zombie's lethal reach costs 22, and
  ranged fire at a Zombie gains 6;
- a Necromancer's target value gains 12 plus 4 per Grave it could raise now
  (at most 3); a kill that leaves an unoccupied Grave beside a hostile
  Necromancer costs 6, and standing on a Grave within 2 of one gains 4;
- threat evaluation includes a hostile Banshee's Wail radius 2 from every
  reachable tile (for a living viewer), Lich splash onto a unit next to a
  friendly unit the Lich can target, and a lethal Zombie hit counting the
  victim's HP again (the rising).

## Revision-14 Plague, Bitten, and Vampire play (`pulp_wars-vkq.18`)

Revision-14 heuristics share the revision-13 gate (a match with an Undead
seat) and read only the public statuses `view.plagued` (whose source Lich is
named only when the viewer sees it) and `view.bitten`, visible units, and the
public previews (`queryCombatPreviewV7` `plagued`, `attackerBitten`,
`defenderBitten`, `attackerBittenRises`, `defenderBittenRises`; the Wail
preview's `bittenRises`; Tend results computed exactly as
`previewTendWoundedV7`). They add no PRNG use, no elapsed-time input, and no
work units; every helper is a bounded scan of the view inside an existing
scoring step (`src/ai/v7-undead.ts`, revision-14 section).

As Undead:

- **Plague targeting.** An attack's new Plague adds 8 per hostile victim
  plus 4 per healthy hostile living neighbour of a victim (the spread next
  turn, at most 4 per victim), and costs 12 per healthy own or allied living
  neighbour (Cooperative allies are living) and 12 for any friendly victim.
  A volley that plagues three or more hostile units takes priority 1182
  (above a plain kill, 1180).
- **Lich care.** A Lich never moves into visible lethal reach unless that is
  strictly safer than staying (fresh Liches stepping toward their siege
  objective fed enemy Catapults one Lich a turn in long games). A Lich that is
  the visible source of two or more plagued hostile units (its death cures
  them all) also retreats from lethal reach at priority 1150 (+8 per sourced
  unit).
- **Bitten.** A new bite on a hostile unit adds 6 plus a fifth of its target
  value, and a new bite also counts 12 in the harm test so a trading Zombie
  attack is not rejected. A death that rises for the viewer or an ally (the
  preview's `*BittenRises`, splash deaths of bitten units, Wail
  `bittenRises`) is worth an Infect rising (22); one that rises for a hostile
  player costs 22. A death that rises leaves no Grave, so it earns no Grave
  value.
- **Raise Dead** counts only Graves whose 5-HP Skeleton would survive the
  visible enemies' next turn (or stands beside a threatened own city); with
  none it is not used, and each doomed Skeleton costs 6. The Necromancer's
  Grave approach uses the same survivable count. This ends the revision-13
  feeding loop.
- **Training.** Lich +16 (the vkq.10 L2 bias) while fewer than three own
  Liches exist, else the revision-13 +4 (uncapped, the bias made the Lich the
  best base value and produced armies of dozens of Liches in long games); a
  Lich is not preferred in a city whose center is inside visible lethal reach
  for a fresh Lich (−40; Liches trained there died before acting). Vampire
  +20 while none is owned and the treasury holds at least 18 Coins.

Every living seat in such a match:

- **Kill the source.** A hostile Lich's target value gains 10 per visible
  plagued own or allied unit it sources (at most 6), and a kill of such a
  Lich takes priority 1285.
- **Tend Wounded** values each Plague cure 30 and each Bitten cure 14 (in
  immediate-value units, 8 per HP healed); a plague cure takes priority 1262
  (1272 for two or more), a Bitten-only cure 1175. A Captain with an unused
  action moves where it cures more (Plague counts double) at priority 1160
  when the tile is outside visible lethal reach.
- **Spread discipline.** A healthy unit never ends a routine move (priority
  below 1100) next to a plagued unit, and one standing next to a plagued unit
  moves away at priority 1150 when that is no more dangerous; a plagued unit
  moves away from healthy own and allied units the same way and toward an own
  Captain that can still tend (1155). Units on an own city center stay.
- **Bites.** A living attacker that a surviving Zombie would bite costs
  8 plus a quarter of its retained value (halved when an own Captain within 3
  tiles can cure it); in the harm test the cost counts double, so a melee chip
  on a Zombie needs a real exchange advantage. Ranged fire draws no
  retaliation and no bite.
- **Training.** A Captain gains 6 per afflicted own unit (at most 18) while
  the seat owns none. Knights get no bias: in measurement, a rich-treasury
  Knight bias large enough to matter replaced Catapults with Knights that
  fed the Zombies bites and Infect risings.

AI fixes from the vkq.10 report, applied in Undead matches only so that
all-Human decisions stay pinned: a city whose center is garrisoned can only
offer naval training, which filled spare capacity with Patrol Boats (about
15 per game), so beyond two owned naval units the policy trains only the
naval role its naval plan asks for.

Changes for every match: the income estimate caps the level term at 5
(revision-14 E2; revision 16: 4, `CITY_LEVEL_INCOME_CAP_V7`), and the Land Grant neutral-tile count excludes explored
tiles whose territory owner is known although the city is not visible (the
`pulp_wars-9jp` stale-view case). Neither changes a pinned all-Human decision
hash; together they change 48 of 300 Human-mirror matrix games without moving
the aggregate results
([balance report §11.4](../validation/RULESET_7_UNDEAD_BALANCE.md#114-all-human-decisions)).

## Revision-15 Plague duration (`pulp_wars-vkq.20`)

Revision 15 limits Plague to three of its owner's turns and lets a unit
spread it only on the first. The policy reads the public
`view.plagued[].turnsRemaining` (still only in matches with an Undead seat):

- **Spread discipline** avoids and isolates only _spreading_ Plague (a unit
  with all three turns left); standing next to older Plague is harmless, so
  healthy units no longer flee it and a plagued unit that can no longer
  spread no longer separates itself.
- **Cures.** Tend Wounded values a Plague cure at 10 per remaining turn (30
  for a fresh Plague, as before); cure priority 1262 needs at least two
  remaining Plague turns among the targets (1272 at five or more), so a last
  turn (2 HP) is tended like a heal. The Captain's approach weighs a Plague
  cure `2 × turns / 3` against a bite's 1, and a plagued unit walks to an own
  Captain only with two or more turns left. The Captain training bias counts
  only such units (and bitten ones).
- **Kill the source.** A Lich's extra target value, its kill priority 1285,
  and its own retreat logic count only sourced victims with two or more
  turns left.
- Plague application value (8 per hostile victim, 4 per healthy hostile
  neighbour) is unchanged: a fresh Plague still deals up to 6 damage and
  spreads once.

## Endgame siege (`pulp_wars-1mc`)

About 80% of round-capped Normal-vs-Normal games were last-city stalls in
every pairing, the Human mirror included
([balance report §13](../validation/RULESET_7_UNDEAD_BALANCE.md#13-endgame-siege-pulp_wars-1mc)).
The winning seat surrounded the losing seat's last city and never took it:
a Captain, Necromancer, or Catapult sat on the besieged center where no
capturer could step in; Catapults killed the defender every turn while the
capturers waited behind their own siege line (greedy Chebyshev movement
cannot step sideways around it); the army never left home, or the last city
had never been explored; and a lone melee attack on a fortified defender was
always rejected as harmful.

The policy now has an **endgame siege mode** (`src/ai/v7-endgame.ts`), for
every faction and match. It reads only public facts: the leaderboard's city
and living-unit counts, visible cities and units, and explored tiles. It is
on for a viewer when

- the viewer holds at least three cities, and
- a living hostile seat holds one or two cities, the viewer at least twice
  as many, and at least as many living units as that seat, and
- no explored, empty, neutral village can be reached over explored land by an
  own land unit (expansion comes first; a village only reachable by sea, or
  one a unit already stands on, does not hold the endgame back).

The targets are that seat's visible cities. The plan holds a breadth-first
route field: steps from each explored, enterable, unoccupied land tile to the
nearest target center, with every occupied tile a wall (Mountains need
Engineering). Revision 18 adds a second field for land units with Move 2 or
more, in which the viewer's own units are passable
([below](#revision-18-movement-estimates-pulp_wars-6gd2)). If a target seat's city has never been explored and every
living hostile seat is a target, the field's sources are the unexplored
tiles within two of that seat's explored territory (the city is there), or
the unexplored map edge when none is known. Everything below is gated on the
plan, so a position outside the endgame keeps its decision exactly: all
2,951 non-endgame decisions along 12 sampled 1v1 matches (every pairing),
and every decision of the pinned Cooperative three-seat parity match, are
byte-identical to the `c7b1849` policy's decisions for the same views.

In the endgame:

- **Squatters leave.** A non-capturing land unit on a target center moves off
  at priority 1291 (just before a capturer's 1290 move onto a hostile city)
  when an own capturer that can still move stands next to it. While any own
  capturer can route to a target, a non-capturing unit does not end a move on
  the eight tiles around a target center, and one standing there moves away
  at 1291; a non-capturing unit does not move onto a target center while an
  own capturer is within two tiles.
- **Capturers close in.** A capturer's move that shortens its route distance
  to a target scores priority 1105 (above routine moves at 700–850) and
  `2 × min(3, progress)` strategic value, when the destination is outside
  visible lethal reach. A capturer that has not moved and still has route
  progress to make does not Pillage (it may Pillage after moving), which ends
  the Pillage-and-rebuild cycling around the last city.
- **Siege units close in.** A Catapult or Lich moves toward a target by route
  and into its 2–3 ring (+8) at 1105 when the destination is outside visible
  lethal reach; in the endgame the ring does not need a durable screen.
- **Combined attacks.** An attack on the defender of a target center that is
  otherwise rejected as harmful (including one that would feed a Zombie) is
  allowed when this attack plus the other offered attacks on that defender
  this turn kill it (applied greedily, strongest first, each previewed
  against the projected wounded defender) and a fresh own capturer outside
  that fire stands next to the center. Such an attack takes priority 1344
  (1343 when the attacker dies, so unanswered hits go first).
- **Landing.** An embarked capturer may disembark within three route steps of
  a target (priority 1105, `10 − 2 × route` value) even while a naval plan is
  active, when the landing tile is outside visible lethal reach.
- **Training.** A city on the targets' route field gives capture-capable
  roles +16 in its shared city-action choice while fewer than four own
  capturers can route to a target, and siege roles (Catapult, Lich) +16 while
  fewer than three own siege units can (a walled, fortified defender that
  heals 4 a turn outlasts Guard chip damage; a Catapult or Lich hit also
  strips Field Defense).

The mode adds no PRNG use, elapsed-time input, or work units: the plan is
built once per decision with the bare context, and each helper is a bounded
scan of the view (the combined-attack check previews at most
`attackers²` attacks on one defender).

## Lich safety, Vampire survival, and Lich hunts (`pulp_wars-vkq.21`)

Three residual weaknesses from the revision-14 measurement
([balance report §11.3](../validation/RULESET_7_UNDEAD_BALANCE.md#113-residual-ai-weaknesses)),
fixed behind the same gate as every Undead heuristic (a match with an Undead
seat), so all-Human decisions and pinned hashes are unchanged. All helpers
read only the public view and public previews, add no PRNG use,
elapsed-time input, or work units, and are bounded scans of the view
([balance report §14](../validation/RULESET_7_UNDEAD_BALANCE.md#14-lich-safety-vampire-survival-and-lich-hunts-pulp_wars-vkq21)).

- **Splash threat from Battleships.** Threat evaluation adds the splash of
  every visible hostile splash unit (a Battleship of any faction, as well
  as the Lich): a unit next to a friendly unit the splash unit can hit from
  where it stands takes `max(1, ceil(damage / 2))`. This reaches every
  safety test built on visible damage (Lich movement, fresh-unit training,
  Raise Dead, and the rest).
- **Liches and Vampires stay ashore.** The measured cause of the Lich and
  Vampire replacement loops on naval maps was not splash but the sea: about
  70% of their deaths were afloat, where they have no attack, Defense 1, and
  sight 1, so Patrol Boats and Battleships they could not see sank them. An
  own Lich or Vampire therefore never boards (an autoembarking Move is not a
  candidate); neither can capture, so a naval invasion carries capturers
  only. Should one be afloat anyway, it keeps the land rule (never into
  visible lethal reach unless strictly safer), an embarking or landing step
  is judged in the form it ends in, and it does not disembark onto a tile in
  lethal reach (a Vampire may when it can strike from there, as below).
- **Vampires attack only when they survive.** An own Vampire's attack must
  kill, or leave the Vampire (after its Lifesteal heal) where the visible
  enemies' projected damage next turn, ranged and splash included and the
  wounded target's reply counted, stays below its HP. Otherwise the attack is
  not a candidate (a proven city save or an endgame combined kill still
  excuses it), and a Move-then-attack is valued only by attacks that pass the
  same test. A Vampire never moves into visible lethal reach unless that is
  strictly safer or it can make such an attack from there, and one standing
  in lethal reach moves out at priority 1150 (a kill, 1180, still comes
  first). A city whose center is in visible lethal reach for a fresh Vampire
  scores the Vampire −40 in its training choice, as the Lich already was.
- **Hunt a plaguing Lich.** For a living viewer, a visible hostile Lich that
  sources a visible plagued own or allied unit (any remaining turn) is a hunt
  target. An own attack-capable, non-support land unit off its own city
  center, within six tiles of a firing position on that Lich (inside its
  attack range band; Catapults need distance 2–3), scores a Move that closes
  that gap at priority 1095 with `2 × progress` strategic value (+4 when a
  ranged unit reaches its band, so it fires next turn without reply), when
  the destination is outside visible lethal reach. 1095 is below the
  spread-discipline threshold (1100), so a hunter never ends next to
  spreading Plague, and below every attack, so a unit in range fires first
  (a kill on the source Lich stays at 1285). A Raider with an Escape pending
  keeps its escape rule.

## Revision-17 Goblin play (`pulp_wars-0ao.6`)

Every Goblin heuristic lives behind one gate: the match has a Goblin seat
(`src/ai/v7-goblin.ts`, `goblinMatchForPolicyV7`). A match without one
never evaluates any of it (no Goblin unit can Kaboom, explode, Gang Up, or
friendly-splash there), so Human and Undead decisions and pinned hashes are
unchanged; a fresh 16-match Human/Undead parity run is byte-identical to the
`0ao.3` policy. (`pulp_wars-0ao.15` later re-pinned some Human/Undead
digests through its all-faction landing rule, not through any Goblin
heuristic: restoring the old landing line restores 16/16 parity.) The helpers read only the public view, public commands, and
the public previews (`previewKaboomV7`, `previewAttackExplosionsV7`,
`queryCombatPreviewV7` with its `gangUp` field). They add no PRNG use, no
elapsed-time input, and no work units: each is a bounded scan of the view
inside an existing scoring step. Values are in the policy's usual units: a
hostile unit is worth its target value (cost × 4 + HP), an own or allied
unit its retained value, damage a proportional share, a Coin 4.

As Goblins:

- **Kaboom** is scored from the exact `previewKaboomV7` chain: hostile damage
  and kills, plus 4 per Plunder Coin, 6 per hostile unit killed on a hostile
  city center, 40 when that clears the center for an own capturer that can
  still step in, and 20 when it kills a unit threatening an own city; minus
  own and allied damage and kills at the friendly-fire trade factor (2, as
  for bombs; `pulp_wars-0ao.7`) and the exploder's value (a third of it
  when visible enemies can kill it anyway; plus a 22-point Zombie when it is
  Bitten by a hostile biter). A net value of 0 or less is never a candidate,
  nor a Kaboom that leaves a threatened own center without killing a
  threatening unit. Priorities: clearing a center for capture 1347, a city
  save 1279, two or more kills 1181 (above a single-kill attack, so the unit
  does not spend its action on one kill), one kill 1178 (after the turn's
  attack kills), a doomed exploder 935 (above Recover), otherwise a chip
  Kaboom worth at least 4 at 895 (after chip attacks soften its targets).
  A unit that can still act moves where its one-wave Kaboom (visible units)
  would kill and beat its current Kaboom at 1177.
- **Gang Up**: a Move that adds a helper next to a visible hostile that
  another own unit can attack scores 1185 when it turns that attack into a
  kill and 905 (above chip attacks) when it only adds damage, both projected
  with the public combat preview; a unit that can attack after moving moves
  next to a target it cannot reach now when its Gang Up attack from there
  kills (1179). Attacks gain 2 per Gang Up, so targets with more helpers
  rank first.
- **Bombs and blasts**: a Bomb Chucker splash on own or allied units costs
  (−12 per damage, −24 per death, and its retained value) instead of scoring
  (the pre-revision-17 sum counted every splash as a gain). An attack whose
  splash or previewed death blasts hurt own or allied units must win at
  least twice that value from hostile units, unless it saves a city, clears
  a hostile center, or is the endgame combined kill. Every attack in a
  Goblin match adds the value of the death-blast chain it sets off (hostile
  minus friendly) and its Plunder Coins.
- **Careful bombs** (`pulp_wars-0ao.13`; friendly fire stays a rule): a bomb
  whose splash kills an own or allied unit is never thrown for a chip (the
  target survives) or when it kills at least as many own and allied units as
  hostile ones (a one-for-one trade is careless too), whatever the trade
  value and even when it clears a hostile city center; only a city save or
  the endgame combined kill excuses it.
  A bomb that splashes any own or allied unit ranks 3 below its tier (1180
  becomes 1177), so the Bomb Chucker's clean bomb of the same tier and other
  units' attacks, which may kill the target first, go before it. A Bomb
  Chucker whose kills from where it stands all splash own or allied units
  moves (1179) where its bomb kills a target it cannot reach now without
  splashing any. An own unit does not end a routine Move next to a visible
  hostile that an own Bomb Chucker can bomb now when that splash would kill
  it there but not where it stands; a smaller splash costs twice its value
  in the Move's strategic value.
- **Spacing**: an own exploding unit (Bomb Chucker, Rocket Cart, Scrap
  Buggy) that any visible enemy can damage (`pulp_wars-0ao.7`; was: that
  visible enemies can kill) does not end a routine Move (below 1100) next to
  own or allied units, and no own unit ends one next to such an exploder, unless the Move sets up a kill or the danger is no worse than
  where it stands; a unit standing in such danger moves out at 760. Both
  costs also reduce the Move's strategic value.
- **Economy**: Plunder (the Goblin `COMMERCE`) is researched at 1070 while at
  least two visible hostile units are within three tiles of own units or
  cities; WAAAGH! is used like Rally, at 1235 when at least two units in its
  radius can still attack a visible enemy this turn (720 for one, never for
  none); a Troll (regeneration) recovers or seeks a Windmill urgently only
  below a quarter of its HP; the Goblin (`FIGHTER`) gains a horde training
  bias of 8 × (1 + min(4, owned Goblins)), so Warrens capacity fills with
  cheap Goblins while the per-role repetition cost still brings in other
  roles; the Bomb Chucker gains a training bias of 6 for its bomb
  (`pulp_wars-0ao.7`: with the HP-led training value the 8-HP Bomb Chucker
  never beat the Orc Brute and was never trained); the living-seat Captain cure bias does not apply (the Warboss
  cannot tend).
- **Turn cap**: the shared scheduler (`chooseNormalTurnCommandV7`) still
  reserves the End Turn slot, so a large horde's turn always closes within
  128 accepted commands.

Against Goblins (every seat in such a match):

- threat evaluation adds a hostile Goblin attacker's Gang Up from its
  owner's units around the tile, Bomb Chucker splash (as Battleship and
  Lich splash), and the fixed Kaboom damage of a goblin-crewed land unit
  within Chebyshev 1 of every tile it can reach (it may Kaboom after any
  Move, even a Rocket Cart). An embarked goblin-crewed unit is modelled like
  any embarked unit: landing ends its activation (`pulp_wars-0ao.15`), so it
  cannot land and Kaboom in the same turn, and the landing reach that
  `pulp_wars-0ao.6` and `0ao.11` had added is gone;
- a routine Move does not end in a clump (two or more own or allied units)
  that a visible goblin-crewed land unit could Kaboom at a profit next turn
  (its best Kaboom from an empty land cell within its Move, or where it
  stands, valued as above from its side), unless it sets up a kill or the
  unit is already that exposed; the exposure also reduces the Move's
  strategic value;
- killing an exploding unit uses `previewAttackExplosionsV7`: the chain is
  valued in the attack score, and a kill whose blast kills own units must
  be worth it (for a hostile unit that could Kaboom the same units on its own
  turn, blast chip damage alone is no extra cost and killed own units count
  once).

## Revision-18 movement estimates (`pulp_wars-6gd.2`)

Revision 18 lets a Move pass through the mover's own units (never ending on
one) and charges half for a step that leaves a usable Road node, whatever
tile it enters
([current rules §9.2](../product/RULESET_7_CURRENT.md#92-road-movement) and
[§12.1](../product/RULESET_7_CURRENT.md#121-movement)). Normal moves only
through offered commands, so it uses both rules without a new heuristic. Its
private estimates were brought in line, from public information only and
with no PRNG use, elapsed-time input, or new work-unit kind:

- **Replacement defender** (`hasReplacementPathWorkV7`). The path search uses
  the public validator's route form (`validatePlayerMovementPassagePathV7`):
  an own-occupied tile is expanded when the Move would not stop on it and is
  never accepted as the replacement's end tile.
- **Threat reach** (`publicThreatenedTilesWorkV7`). A visible unit of another
  seat passes the visible units of its own owner and no other unit's, cannot
  end on any unit, and cannot pass an own unit on a tile where it would stop
  (a roadless Forest or Mountain, or hostile zone of control). A step costs
  half when the tile left is a Road node for that unit's owner; the Forest
  and Mountain stop is waived only when both ends are such nodes.
- **Endgame route fields** (`src/ai/v7-endgame.ts`). A land unit with Move 2
  or more reads `passRouteDistanceByKey`, in which the viewer's own units are
  passable; no offered Move ends on one, so they are never end tiles. A
  Move-1 unit spends its whole budget on one roadless step and can never
  pass a unit, so it keeps `routeDistanceByKey`, in which every unit is a
  wall; this keeps the `pulp_wars-1mc` routing of a capturer around its own
  siege line. Another seat's units are walls in both fields. Training and
  landing read the walls field.
- **Road corridor.** Unchanged: it still builds every missing tile to the
  chosen city, because Road population needs the last tile although movement
  no longer does.

The public-planning benchmarks were rechecked: the two captured late views
offer more Moves (operations 66,220 → 66,235 and 94,408 → 94,442), and the
public validator now derives the Road-node fact of each tile once per step,
so the captured view's tile reads stay under the 6,000 bound.

## Revision-19 Dinosaur play (`pulp_wars-c87.5`)

This section describes the policy as amended by revision 20
(`pulp_wars-0hi.2`, [contract section 7.3](../product/RULESET_7_REVISION_20.md#73-normal-ai)):
the `STAMPEDE` command and every lane heuristic are removed, and the
Triceratops is played as a front-line attacker with Charge!.

Every Dinosaur heuristic lives behind one gate: the match has a Dinosaur seat
(`src/ai/v7-dinosaur.ts`, `dinosaurMatchForPolicyV7`), or reads a fact that
only a Dinosaur-faction unit has (an Egg, `GROW`, `LINEBREAKER`, `ACID`, an
armour reduction, a slot value above 1). A match without one never evaluates
any of it, so Human, Undead, and Goblin decisions change only through the
revision-20 Promotion rule below: a 28-match parity run against the
revision-19 policy (`f1c17bd`; Human, Undead, and Goblin seats in two-,
three-, and four-seat matches, 60 rounds, compared command by command) has
12 identical matches, and each of the other 16 first differs at a `PROMOTE`
of a wounded unit. The helpers read only the public view, public commands,
and the public previews (`previewHatchV7`, `queryCombatPreviewV7` with its
`runUp`, `fortificationIgnored`, `push`, `advances`, `acid`, and Armoured
fields, `previewAttackExplosionsV7`). They add no PRNG use, no
elapsed-time input, and no work units: each is a bounded scan of the view
inside an existing scoring step, cached per decision. Values are in the
policy's usual units (a unit is worth cost x 4 + HP).

Shared estimates (every match; all neutral without a Dinosaur unit):

- **Damage estimate** (`publicProjectedDamageWithLookupV7`): an attacker with
  Acid ignores the defender's cover and fortification; an Armoured defender
  takes one less (minimum 1) before the cap at its HP; an Alpha's +1 Attack
  is in its published Attack, and the Pounce estimate adds it to the role's
  base.
- **Unit value**: a grown unit is worth 10 more per stage, as a target
  (`targetStrategicValue`) and as an own unit (`retainedUnitValue`); a visible
  Egg is worth the role inside x 4, its HP, and 2 per turn it still needs.
- **Threat reach** (revision 20): a visible hostile Triceratops threatens
  what any melee unit with its Move threatens: the tiles next to it and the
  tiles it can attack after a Move. For a tile it reaches by a Move the
  projected damage adds the run-up (`chargeRunUpForPolicyV7`: +1 Attack per
  tile it must at least move, up to +2); a Triceratops that already moved
  this turn publishes its run-up in its unit stats. Its projected hit
  ignores the defender's City Walls and Field Defense (cover is kept), and
  a hostile dinosaur unit's projected hit ignores City Walls: the owner's
  research is not public, so the estimate assumes Wallbreaker
  (`ignoresWallsForPolicyV7`). An own dinosaur ignores Walls in the
  estimate only when the seat has Wallbreaker.

As Dinosaurs:

- **Production.** `LAY_EGG` competes with `TRAIN` as the city's land
  production, one nest tile per role. In addition to the shared role values:
  each hatch turn beyond the first costs 1 (12 per hatch turn in a threatened
  city, so short-hatch Eggs and trained units come first there); a two-slot
  Egg that takes the last slots of a city with capacity 3 or less costs 4; the
  first Charge! unit gains 20 (4 before `pulp_wars-c87.8`: a third of the
  seats that researched Sawmilling never laid a Triceratops Egg); the first
  Shaman gains 10 while an own Egg with
  two or more turns left waits or at least three own attackers could use War
  Drums, and a Shaman costs 30 in a threatened city (it is no defender). An
  Egg is never laid on a tile where the visible enemies' projected damage
  next turn destroys it, nor in a threatened city with an empty center while
  a unit can be trained there instead. Hatch times read Nesting.
- **Nest tile.** The offered tile with the least projected damage to an Egg
  there next turn, then the fewest visible hostile attackers within two Moves
  plus their range, then the tile farthest from every visible hostile unit,
  then the one next to more own land units, then (y, x) order.
- **Abandoning an Egg** is a candidate only in an emergency: the home city is
  threatened, its center is empty, it has no free slot and its city action,
  the Egg's slots would free one, the refund covers a Caveman, and the Egg
  needs two or more turns. It then takes priority 1261 (a threatened city's
  training is 1260). The ordinary Disband rule no longer applies to Eggs, so
  a doomed Egg is not sold for its refund.
- **Egg protection.** An own Egg is worth the unit inside, scaled by how
  soon it hatches (all of it next turn, two thirds in two turns, half in
  three). An attack on a unit whose reach includes an own Egg gains that
  value (its share for a hit that does not kill). An own attacker steps next
  to an Egg that a visible enemy can reach before it hatches (within its
  remaining turns, looking at most two turns ahead) and that has no own
  attacker beside it (priority 760, a quarter of the value, +2 toward the
  nearest enemy), when the tile is outside visible lethal reach; the sole
  such guard makes no routine Move (below 1100) away from the Egg until it
  hatches or the enemy is gone.
- **Hatch.** Scored by the unit inside (cost x 4 + HP), 10 per turn saved,
  and 20 when visible enemies can hit the Egg: 1262 for such an Egg, 1085
  for an Egg with two or more turns left, 640 otherwise (only when the
  Shaman has nothing better; it hatches next turn anyway). A Shaman with its
  action steps next to an Egg it can hatch (1084, then it hatches), stands by
  an Egg laid this turn (760), and makes no routine Move away from a long
  Egg.
- **Grow.** A growth stage fully heals (revision 20), so a kill that grows
  the unit is valued by the HP it restores: 5 per two HP of the unit's
  missing HP plus the stage's 4 (10 at full HP, as before), plus 6 for
  reaching Alpha. On equal damage the growing, and the more wounded, unit
  takes the kill. A grown unit recovers
  below two thirds of its HP (priority 930; an ungrown unit below half),
  steps out of visible reach when that wounded (935), leaves visible lethal
  reach at 1150, never makes a routine Move into it unless that is strictly
  safer, and does not make a non-lethal attack that leaves it where the
  visible enemies kill it when it is not already that exposed (a proven city
  save, a lethal follow-up this turn, or the endgame combined kill excuses
  it).
- **Charge!** (revision 20). The Triceratops is judged by its abilities,
  never by its `SIEGE` label (`policyTacticalRoleV7`, `policySiegeRuleV7`):
  it is a front-line melee attacker, needs no screen, and is not kept behind
  the army. Its attacks are ordinary `ATTACK` candidates scored from
  `queryCombatPreviewV7`, with these additions (`chargeAttackScoreV7`): 8
  for Field Defense destroyed on the target tile, 20 for pushing the
  defender off a hostile city center (the Triceratops follows and besieges)
  plus 15 with an own capturer within two tiles, and minus the exposure on
  the tile it ends on after a Push and follow (its whole value when the
  visible enemies kill it there, otherwise half the share it loses).
  Priorities: pushing a defender off a center next to a capturer 1345; a
  non-lethal hit that destroys Field Defense 910 (above chip attacks);
  kills and other hits keep the ordinary attack priorities. Fortified
  targets are preferred because the preview already ignores their Walls and
  Field Defense.
- **Run-up.** A Triceratops that has not moved takes a Move (priority 860,
  above routine Moves) onto a tile next to a visible hostile unit or Egg
  that it can attack afterwards, valued by the projected Charge from there
  with the run-up of that path, when the tile is outside visible lethal
  reach; among such tiles a two-tile path is preferred. One that already
  stands next to its target steps around it first when the run-up makes the
  Charge better than attacking from where it stands: priority 912 when the
  attack it replaces is a chip, 1181 when the run-up turns it into a kill.
  A Move never gives up an attack it has now for nothing: the approach is a
  candidate only when the following attack is offered from the destination
  (zone of control ends a Move, so the estimate uses the tiles actually
  moved).
- **Promotion** (revision 20, every faction and every match). A unit that
  can be promoted and is wounded is promoted at priority 1410, before any
  attack, capture, or End Turn; an unwounded one keeps the old priority.
  The policy never holds a Promotion back as a later heal.
- **Industry research** (revision 20). Nesting is researched at priority
  1062 (above the ordinary role plan, 1060; below land production, 1080)
  while an own city has fewer than two free slots, otherwise at 1040; its
  value is 4 per owned city plus 4 for its Egg effects. Wallbreaker is
  researched at 1061, valued at 8 per visible hostile city with Walls,
  while one is visible and the seat owns a dinosaur unit that would use it.
- **Signature research** (`pulp_wars-c87.8`). Once the seat owns two cities,
  the next technology toward the signature role whose technology it lacks
  (the Triceratops through Sawmilling or the T-Rex through Chivalry; the one
  with fewer technologies left first, the Triceratops on a tie) takes
  priority 1170: above land production (1080) and the best economic plan
  (1160), below every naval objective (1280). Its strategic value is the
  role's HP plus its Attack and Defense in half-units. The ordinary role plan
  (1060) bought both tier-3 technologies only after most matches were
  decided; nothing is saved up for it (a one-turn Coin hold was measured and
  dropped, as was a rule that kept two slots free for the first big body:
  neither moved the measurements).
- War Drums, Tend Wounded, Rampage, and Pounce use the Rally, Tend, Overrun,
  and Charge rules unchanged.

Against Dinosaurs (every seat in such a match):

- **Eggs.** An attack that destroys a visible hostile Egg is an ordinary kill
  (1180) valued at the Egg, so long-hatch Eggs rank first. A hit that does
  not destroy it is a candidate only when the Egg needs two or more turns
  (Eggs never heal; a chip at 900) or this turn's offered attacks destroy it
  together (each unit's best hit, summed). A melee kill is not taken when
  the Egg is worth less than the attacker, the advance onto its tile is
  inside visible lethal reach, and the attacker is not already that exposed.
  A unit that can attack after moving steps where its projected hit destroys
  an Egg it cannot reach now (1179, half the Egg's value), outside visible
  lethal reach. City defence and capture keep their priorities.
- **No lane blocking.** The revision-19 heuristic that stepped an own unit
  into the Stampede lane of a visible hostile Triceratops was deleted with
  Stampede (`pulp_wars-0hi.2`); a Triceratops is countered through the
  shared threat reach above.
- **Growth.** An attack whose retaliation kills the attacker, against a unit
  one kill from Big or Alpha, is not a candidate (only a city save, a lethal
  follow-up, or the endgame combined kill excuses it), and it and a
  non-lethal melee hit that leaves the attacker where the wounded target
  kills it next turn cost that growth (10 or 16). A Move into the visible
  lethal reach of such a unit costs the same. Grown units are worth more as
  targets, so kills on them go first.
- **Armoured.** A hit of at most 1 damage on an Armoured unit that survives
  is not a candidate (same excuses).
- **Goblin blasts.** Kaboom, bomb splash, and death-blast chains value an Egg
  like any hostile unit, at the Egg's target value above.

Opening research is unchanged, and research valuation is unchanged except
for the Dinosaur signature research above. In a 140-match sanity sample (10
seeds x sizes 11 and 14 x `DH`, `HD`, `DU`, `UD`, `DG`, `GD`, `DD`) no match
had a policy error, a stall, or a turn at the 128-command cap (the longest
turn used 49 commands). `pulp_wars-c87.8` tuned the numbers above against the
balance acceptance; the measurements are in the
[Dinosaur balance report](../validation/RULESET_7_DINOSAUR_BALANCE.md), an
interim baseline ahead of the revision 20 rework.

## Martian play (`pulp_wars-t6s.3`)

Every Martian heuristic lives behind one gate: the match has a Martian seat
(`src/ai/v7-martian.ts`, `martianMatchForPolicyV7`), or reads a fact that
only a Martian unit has (a Shield, a heat ray, a walker's or flyer's
movement, the Force Field, Beam Down, Mind Control, a controlled unit, the
Tractor Beam). A match without a Martian seat never evaluates any of it: the
[parity run](#martian-measurements) is byte-identical. The rules and their values
are in `src/ai/v7-martian.ts`; the policy (`src/ai/v7.ts`) calls them from
its existing scoring steps. They read only the public view, the offered
commands, and the public previews (`queryCombatPreviewV7` with its
`rayPower`, `defenderShieldDamage`, and `attackerShieldDamage`,
`previewKaboomV7` with each result's `shieldDamage`), cached per decision.
They add no PRNG use, no elapsed-time input, and no work units. Values are in
the policy's usual units (a unit is worth its cost x 4 plus its HP).

Shared estimates (every match; all neutral without a Martian unit):

- **Shields.** The projected damage to an own unit in the enemy turn is
  reduced by the Shield it will have then: its current Shield, or with Force
  Fields the End Turn recharge (4 next to an own Projector).
- **Rays.** A visible hostile ray unit threatens at full power only where it
  need not move and while it is not Cooling; otherwise at half power.
- **Machines.** A visible hostile flyer's reach passes every unit, ignores
  zone of control, and crosses Shallow Water; a walker's enters Mountains
  without Engineering and is never stopped by terrain. Both attack only from
  land, and a flyer never from a center it does not own. Machines never get
  cover or fortification in the estimate.
- **Values.** A hostile Projector is worth 4 more per covered unit next to
  it, a Saucer 8 more while its owner holds a city, a Mothership 8 more
  (since `pulp_wars-1wy.4`: the carrier with the free pull), a Brain the value of its
  controlled unit (released with it; doubled when it was the viewer's own,
  see the [Mind Control play](#mind-control-play-pulp_wars-b5f3)), and a
  ray unit that can fire at full power 4 more. An own controlled unit is
  worth its kind cost scaled by its HP; a Brain carries it. A lethal
  follow-up projection also strips the Shield the first hit took.

As Martians:

- **Production.** The role value gains two per Shield point
  (`HP + 2 x Shield`). In a threatened city the Grunt gains 15 (12 before
  `pulp_wars-b5f.2` raised its cost to 3, 14 before `pulp_wars-1wy.6` gave
  it 8 HP: the role value counts HP, and at 14 the Ray Gunner won) and the
  Projector, Saucer, and Brain cost 30 (bodies first; the Projector loses the
  Guard's threatened bonus too). In the preferred role the Grunt's repetition
  costs 5 a unit instead of 8; the Ray Gunner gains 10 (the main damage, about
  two for every three Grunts). A Projector gains 4 while the army has more
  than four front units (Grunts, controlled units, Ray Gunners, Tripods, the
  Colossus; a controlled unit never counts as one of the seat's own roles)
  per Projector and at least three, and otherwise costs 20; a Saucer gains
  10 while the army has more than three front units per Saucer and otherwise
  costs 20 (since `pulp_wars-1wy.4`; before, a second Saucer cost 20 below
  six front units and a third always); a Brain gains 10 at war
  with four or more front units and fewer than one Brain per six, otherwise
  costs 20; a Tripod (one per three front units) and a Mothership (one per
  six) gain 30, so they are bought as soon as they are offered (the
  Dinosaur T-Rex finding).
- **Research.** Drill and Scouting first (1062, just above the role plan);
  with two cities Marksmanship and Administration, then Force Fields once a
  Projector exists, then the Tripod's and the Mothership's technologies (the
  shorter chain first). These take priority 1150 (Force Fields 1145:
  above land production, below the best economic plan) once the army has
  three front units (five for the tier-3 machines), and 1062 before:
  researched ahead of training they starved the opening of Grunts, and at
  the Dinosaur signature priority (1170, above the economic plan) they won
  fewer head-to-head games. The Disintegrator (1061) while a visible
  hostile unit stands fortified and the seat owns a ray unit.
- **Rays.** A ray unit that can fire at full power makes no routine Move
  while it has an offered attack or stands three tiles from a hostile
  non-ray land unit (it holds its tile, unless it is in lethal reach); one
  without a target steps to range 2 of a hostile unit holding a settlement
  center (760, it fires at full power next turn). A Cooling ray unit next to
  a hostile melee unit steps to a tile at range 2 of a hostile unit and next
  to none (905, above its half-power chip). A full-power kill that the
  half-power shot would also make waits (1176, below other kills) and costs
  6: the next turn's full shot is worth keeping.
- **Shields.** Shield spent on retaliation costs 2 a point without Force
  Fields (it is exposure in the enemy turn). A unit ending a Move next to an
  own Projector gains 3; a Projector's Move gains 4 per own shielded unit it
  then covers (705 when it covers more). A wounded unit with no Shield left
  steps out of visible reach (935).
- **Pierce.** A Tripod attack whose Pierce kills an own or allied unit
  without killing the target is not a candidate (a city save excuses it);
  the friendly splash cost and the hostile splash gain are the generic ones.
- **Beam Down** (865, above routine Moves). A passenger that cannot attack
  this turn, is not a Brain, and is not the garrison of a city with a hostile
  unit within three tiles goes onto a tile next to the Saucer when that gains
  at least three campaign route steps toward its job, lands within two
  tiles of another own land unit, and is outside visible lethal reach.
  Value: 4 per route step gained (at most 8), 8 more for a passenger that
  cannot walk this turn (a unit trained this turn), minus twice the danger
  there. Commands are scored directly; nothing is previewed, so the larger
  command list costs one cheap score each. This is the delivery by route;
  since `pulp_wars-1wy.4` an extraction or a shot on arrival is scored
  first ([Martian mobility play](#martian-mobility-play-pulp_wars-1wy4)).
- **Saucer.** With a wave target, it moves only to stage (720): about four
  tiles from that city, within two tiles of the army. Its hits that do not
  kill are not candidates (a city save excuses it); it never makes a routine
  Move into visible lethal reach unless that is no worse. (Before
  `pulp_wars-1wy.4` an unmoved Saucer with a Beam Down worth taking made no
  routine Move: Beam Down needed an unmoved carrier. The beam is still
  taken first, at 865 or above.) Its pulls, its extraction flights, and the
  siege pull are in the
  [Martian mobility play](#martian-mobility-play-pulp_wars-1wy4).
- **Brain.** Mind Control (1186, above every kill) on the most valuable
  convertible target (what it becomes; see the
  [Mind Control play](#mind-control-play-pulp_wars-b5f3)). A Brain that
  can still Mind Control moves where a convertible target is in range
  (1183), outside lethal reach. An attack that leaves a hostile unit
  convertible by a ready own Brain (in range, or one step away) goes at
  1182, and the first of two hits that do so at 1177. Psychic Command uses
  the Frenzy rule (only adjacent units that can still attack count: 1235
  for two, 1190 for one) and waits (1100) while the Brain can Mind Control.
  A Brain makes no routine Move next to a visible hostile land unit unless
  it already stands next to one.
- **Controlled units** are own units of their kind, played by their kind's
  per-unit rules ([Mind Control play](#mind-control-play-pulp_wars-b5f3)).
- **Mothership** (and, since `pulp_wars-1wy.3`, every Saucer: both carry
  the beam; what `pulp_wars-1wy.4` changed is in the
  [Martian mobility play](#martian-mobility-play-pulp_wars-1wy4)). The
  Tractor Beam is scored by the pull's effect: a
  defender off a hostile center next to an own capturer that can still step
  in (1347); a besieger off an own center (1279); a hostile unit pulled
  where own units that need not move deal its Shield plus HP (1181); a
  fortified unit pulled off its fortification into the reach of at least
  half its HP (1150); an own unit pulled out of lethal reach (1150). Any
  other pull is not a candidate. The Mothership makes no routine Move away
  from the army (no own land unit within two tiles) toward visible hostile
  units, and gains 2 per own land unit within two tiles.
- **Machines and water.** A walker or flyer with a job it can walk to
  crosses water only inside a Move and never ends a routine Move on water
  (afloat it cannot fight); without one it may self-launch, but never
  within three tiles of a visible hostile naval unit.
- The campaign plan is unchanged: Martian units take jobs and waves like
  every unit, which brings ray units and Projectors along with the wave.

Against Martians (every seat in such a match):

- **Focus fire.** When this turn's offered attacks on a shielded unit (each
  attacker's best whole hit, Shield plus HP damage, at least two attackers)
  reach its Shield plus HP, each hit on it that does not kill goes at 1179
  (ranged, no retaliation: they strip the Shield first) or 1178, above every
  chip, worth 10 plus the share of the target's value that its Shield damage
  is. Such a hit is never rejected as harmful. Any other hit keeps the
  generic rule, so a hit that a full Shield absorbs and nothing follows up is
  not taken.
- **Cooling.** A hit on a Cooling ray unit gains 6.
- **Mind Control denial.** A wounded unit at 6 HP or less that the engine
  would let a Brain take (`mindControlTargetBlockV7`: one slot, land form,
  not a construct, not on a settlement center or a Rift; since
  `pulp_wars-b5f.3` also wounded, below its maximum HP) makes no routine
  Move into three tiles of a ready visible hostile Brain, and steps out of
  the Brain's range (1150, by its retained value, so the most valuable
  first) when it is inside it and a tile outside lethal reach exists.
- **Pulls.** While a visible hostile puller is within five tiles of an own
  city center whose only adjacent own unit stands on it, a Move that puts a
  second unit next to the center goes at 1245. A puller is a Mothership
  (Move 2, reach 3) or, since `pulp_wars-1wy.4`, a Saucer (Move 3, reach 2);
  before, a Mothership within four tiles.
- **Goblin seats.** A Kaboom gains 4 per Shield point it strips from a
  hostile unit that own attacks can still hit this turn.

Not covered: the Colossus uses the generic Juggernaut play with the ray
rules above; Strafe uses the Charge rule unchanged.

### Martian measurements

All on Dry Land, Normal against Normal, Rival mode, the balance-testing
policy's coarse samples. "Placeholder" is the policy of `d88503c` (the
generic policy on the Martian registration); "Martian" is this policy. The
runs used a scratch harness that loads both policies over the same engine and
gives each seat its own policy; nothing in the shipped policy switches.

**Head-to-head, Martian mirror** (the Martian policy on one seat, the
placeholder on the other, every seed in both seat orders):

| Board   | Seeds | Round cap | Decided | Martian policy | Placeholder |
| ------- | ----: | --------: | ------: | -------------: | ----------: |
| 11 x 11 |  0-39 |       120 |      80 |             44 |          36 |
| 14 x 14 |  0-29 |       150 |      60 |             33 |          27 |
| Total   |       |           |     140 |       77 (55%) |          63 |

The edge is modest and consistent: every intermediate run of 40 to 80
games while the rules were built came out between 50% and 57% for the
Martian policy, and so did removing any one group of rules (production,
research, attacks, Moves, Beam Down, the Shield-aware danger). Most seeds
are won by the same seat in both orders (the map decides them in the
opening, before a Ray Gunner, a Brain, or a Tripod exists); the rules decide
the seeds that flip.

**Usage** (the Martian policy's seats in the head-to-head; in brackets the
placeholder's): seats that trained each role, 11 x 11 of 80 and 14 x 14 of
60:

| Role             | 11 x 11 | 14 x 14 |
| ---------------- | ------: | ------: |
| Grunt            | 80 (80) | 60 (60) |
| Saucer           | 50 (63) | 43 (53) |
| Shield Projector | 49 (56) | 46 (56) |
| Brain            |  33 (0) |  32 (0) |
| Ray Gunner       | 18 (10) | 34 (28) |
| Tripod           |  13 (9) | 26 (19) |
| Mothership       |   5 (0) |  16 (0) |

Abilities, 11 x 11 and 14 x 14: Beam Down 174 and 224 (in 38 of 80 and 39
of 60 seats); Mind Control 24 and 21 (15 and 15 seats; 45 Thralls, 3
captures by a Thrall); Tractor Beam 3 and 32; Psychic Command 133 and 128;
full-power rays 109 and 449 against 70 and 289 at half power (35 and 107 of
them after a Move); Pierce hits on hostile units 13 and 42, on own units 3
and 3. The placeholder used no Beam Down, Mind Control, Tractor Beam, or
Psychic Command. Shields recharged to 4 (the Force Field, and the
Mothership's own maximum) 852 and 1,044 times.

**Against each faction** (the Martian policy on both sides of the matchup,
seeds 0-7 in both orders on 11 x 11 and 14 x 14, 32 decided games each,
Martian wins first): Humans 18-14, Undead 16-16, Goblins 17-15, Dinosaurs
15-17. No pairing is beyond 70/30; the numbers are the balance bead's
(`pulp_wars-t6s.5`) to tune. Its 60-game pairings, the AI-side findings
(Mind Control and the Tractor Beam below their usefulness thresholds), and
its proposals are in the
[Martian balance report](../validation/RULESET_7_MARTIAN_BALANCE.md).

**Parity.** 27 matches without a Martian seat (Human-Undead,
Goblin-Dinosaur, Dinosaur-Human, and Undead-Goblin on 11 x 11, seeds 0-5;
Human-Goblin-Dinosaur on 14 x 14, seeds 0-2) end in the same state hash
after the same number of accepted commands under both policies.

**Cost.** With 8 ms slices the longest slice of three Martian mirror
matches was 10.4 ms and the longest decision 48 ms; no turn reached the
128-command cap through a Martian rule. (Two Martian-mirror turns did reach
it through the generic economy: a `REDEVELOP` and `BUILD_LUMBER_CAMP` pair
repeated on one tile by a rich seat, a generic-policy issue this bead
did not change; `pulp_wars-9s0.9` fixed it, see
[the Redevelop and rebuild cycle](#the-redevelop-and-rebuild-cycle-pulp_wars-9s09).)

### Martian ranged play (`pulp_wars-b5f.2`)

The Grunt's ray pistol (range 1–2) and the Tripod's range-2-only ray
(minimum range 2, Sight 2) are registry facts, so the generic policy already
shoots from two tiles: it reads every unit's range from the public combat
facts, and the Tripod has no adjacent shot to take. One rule is added, in
`martianRangedStepBackV7` (`src/ai/v7.ts`) behind the switch
`MartianPolicyOptionsV7.rangedStepBack` (`setMartianPolicyOptionsV7`, for the
head-to-head and the tests only):

- **Step back** (904, above the chips and below the kills). A Martian
  shooter with range 2 that can still attack after a Move, standing next to
  a hostile land unit that cannot shoot at range 2 (or, for the Tripod,
  inside its minimum range of any hostile unit) and not on a settlement
  center, moves to a tile with no such unit that close, from which a
  visible hostile land unit is in range, outside visible lethal reach;
  value 6 plus the targets in range minus half the danger. A ready ray unit
  with a full-power shot where it stands keeps it. A Tripod with a hostile
  unit inside its minimum range no longer holds its tile for an approaching
  unit.
- In a threatened city the Grunt's production bias is 14 (was 12): it
  cancels the Grunt's third Coin in the role value's "minus twice the cost"
  term, so threatened cities still train Grunts (the existing test failed
  with a Ray Gunner at 12). It is not behind the switch. Since
  `pulp_wars-1wy.6` (the Grunt at 8 HP, `7r39`) it is 15, for the same
  reason: the role value counts HP, and at 14 the same test failed with a
  Ray Gunner again.

**Head-to-head, Martian mirror** (the policy with the step back on one seat
and without it on the other, every seed in both seat orders, Dry Land
11 x 11, round cap 120, `allowDuplicateFactions`, the `pulp_wars-b5f.2`
rules): seeds 0–29, 60 decided games, **29 to 31**. Neutral. A second rule,
walking a shooter with no target in range to a tile two tiles from one
(760, the ray siege tier), lost: 23 to 37 in its first form and 26 to 34 with
the step back corrected (a hostile Grunt or Marksman next to a shooter is
not a reason to step back, since it answers at two tiles), so it was
dropped. Against the six factions (seeds 0–13 in both orders, 168 games)
Martians with the step back won 98, and with the `7r30` Martian policy on the
same rules 96. The rule is kept although it is neutral on wins, by the
second-pass precedent, because it moves the measured problem: Grunt attacks
from two tiles rose from 84% (5,232 of 6,262) to 88% (6,313 of 7,172) and
the share drawing retaliation fell from 10% to 7%; and the Tripod, which
cannot fire at an adjacent unit, needs it to shoot at all when the enemy
closes in.

**Tripod diagnosis** (at `7r30`, before the change: 168 coarse games and a
40-game mirror). Tripods fired 262 times, 87% from two tiles and 13% from
the next tile (18% of all shots drew retaliation); every hostile unit two
tiles from a Tripod at the start of its owner's turn was visible (88 of 88
in a sample). The AI used the range; the rule allowed the adjacent shot,
which is what a player with a lone Sight-1 Tripod sees as melee play. After
the change all 307 Tripod shots in the 168 coarse games came from two tiles
and none drew retaliation. Details and the coarse matchups are in the
[Martian tuning record](../product/RULESET_7_MARTIANS.md#165-tuning-record).

**Parity.** The rule and the bias are Martian-only (`viewerMartian`), so
matches without a Martian seat are unchanged.

### Mind Control play (`pulp_wars-b5f.3`)

The AI step of the [Mind Control revision](../product/RULESET_7_MIND_CONTROL.md#8-normal-ai)
(identity `7r33`, no identity change): a Mind-Controlled unit keeps its kind,
so the policy values a target by what it becomes and plays a controlled unit
by its own kind's rules. Everything is behind
`MartianPolicyOptionsV7.mindControlPlay` (`setMartianPolicyOptionsV7`, tests
and harnesses only); off, the policy decides as the engine step did.

As Martians:

- **Value.** `mindControlValueV7`: the kind cost of the target's role (2
  without one) plus its kills, less 1 per ability it loses under control
  (Raise Dead, Infect, Bite, Hatch, Assemble, Mind Control, tunnel riding),
  at least 1. Mind Control (1186) takes the highest value, ties by the lower
  unit ID (a 9-Coin Knight over a 2-Coin Fighter at equal HP; a Zombie is
  worth 1).
- **Mind Control first.** An own attack on a unit an offered Mind Control
  targets waits at 1185 unless it is worth 1300 or more (clearing or
  capturing a city): a threatening Knight is converted, not hit.
- **Setup.** The single-hit setup (1182) and the Brain's approach (1183)
  rank by 10 x value. New: the first of two own hits that together leave a
  target worth at least 3 at 1 to 6 HP, for a ready own Brain in reach, goes
  at 1177 (focus fire, then convert; the second hit is then the 1182 setup).
  A Brain at its limit (one controlled unit) or on cooldown sets nothing up
  and does not approach. Setup, approach, and denial read the engine's
  per-target test (`mindControlTargetBlockV7`): a construct, a unit on a
  Rift, an already controlled unit, and an unwounded unit (a 6-HP Goblin at
  full HP) are not targets.
- **Controlled units** are own units of their kind. Every per-unit rule
  reads the unit's kind through `policyUnitFactionV7` (the
  [kind-reader audit](../../tests/fixtures/v7-kind-reader-classes.ts) lists
  what remains seat-level): the Kaboom setup, Gang Up, and bomb-safety
  Moves (Goblin); the Ice Folk attack order, Sabretooth, Witch, Snow cover,
  and the Ice Folk facts' unit lists; Tunnel, Bomb Run (bomb damage from the
  controller's research through the Dwarf tree), the Gunner and Knockback
  rules, the Dwarf Moves, and Repair (a controlled Engineer repairs, it
  cannot Assemble); the Vampire's and Lich's rules and the Undead Moves;
  the Dinosaur Moves; Frenzy, WAAAGH!, and Psychic Command by the
  commander's kind; the Martian ranged step back only for Martian shooters.
  Seat plans (research, production, economy) stay the viewer's. A
  controlled unit's retained value is its kind cost x 4 scaled by its HP
  plus its HP and twice its kills (was its HP only); a Brain carries it. The
  Thrall's front-row chip (901) is gone. It is never disbanded (the engine
  never offers it; a `DISBAND` scores -1). It never counts as one of the
  seat's own roles in production, only as a front unit.

Against Martians:

- **Brain bonus.** A hostile Brain is worth the value of its controlled
  unit (kind cost x 4 plus HP plus twice its kills), **doubled when that
  unit was the viewer's own** (killing the Brain gives it back); was 8 plus
  its HP.
- **Denial** adds the wounded test (above) and steps the exposed units out
  of reach by their retained value, the most valuable first.

**Head-to-head** (a scratch harness that sets `mindControlPlay` per seat
before each decision; Dry Land, 11 x 11 and 14 x 14, seeds 0-11, both seat
orders, round cap 150, 48 games per pairing; every game decided, no errors,
stalls, or caps). "new": both seats on; "old Martian": the Martian seat off;
"old opponent": the opponent off. Martian decided wins:

| Martian against | New         | Old Martian | Old opponent |
| --------------- | ----------- | ----------- | ------------ |
| Human           | 28 (58.3%)  | 28          | 28           |
| Undead          | 32 (66.7%)  | 32          | 32           |
| Goblin          | 25 (52.1%)  | 25          | 25           |
| Dinosaur        | 29 (60.4%)  | 30          | 29           |
| Ice Folk        | 21 (43.8%)  | 22          | 21           |
| Dwarf           | 25 (52.1%)  | 24          | 25           |
| All (288)       | 160 (55.6%) | 161 (55.9%) | 160 (55.6%)  |

The paired games (same seed, size, and order) end with the same winner in
285 of 288 against the old Martian policy (the new policy wins one game
the old lost, the old two the new lost) and in all 288 against the old
opponent policy; only 18 and 5 pairs differ in length. Mind Control happens late and rarely: a Martian
Brain exists in 123 of 288 seat-games, and most matches are decided before
one meets a wounded target. **Martian mirror** (the new policy on one seat,
the old on the other, seeds 0-29, both orders, both sizes): 60 of 120,
neutral. So the pass is neutral on wins (inside the contract's "not below
the old minus 5 points") and moves what it was for:

| Martian seats (288 seat-games)       | New               | Old Martian       |
| ------------------------------------ | ----------------- | ----------------- |
| Brain seat-games with a Mind Control | 44 of 123 (35.8%) | 35 of 123 (28.5%) |
| Mind Controls                        | 64                | 50                |
| Kills by controlled units            | 16                | 3                 |
| Captures by controlled units         | 13                | 5                 |
| Controlled units that died           | 43                | 37                |
| Released (Brain lost)                | 3                 | 1                 |

**Coarse balance** (the "new" column; Dry Land only): every Martian pairing
is inside 65/35 except Martian over Undead at 66.7% (32 of 48), which is the
same 32 of 48 with either Martian policy (the Undead pairing was 53% at
`7r25` in the [Martian balance report](../validation/RULESET_7_MARTIAN_BALANCE.md);
the move predates this pass, a watch item for the balance work). Mind
Control in 35.8% of Brain seat-games is above the contract's fallback line
(30%) and below the `7r25` 39% (limit 2, no wounded test).

**Parity.** 24 matches without a Martian seat (Human-Undead,
Goblin-Dinosaur, Ice Folk-Dwarf, Dwarf-Goblin, Undead-Ice Folk,
Dinosaur-Human; 11 x 11 and 14 x 14, seeds 0-1) end in the same state hash
and command count as under the engine-step policy (`c24e06d`), and so do 12
Martian matches (Martian-Undead, Goblin-Martian, Martian-Ice Folk) with the
switch off.

### Martian mobility play (`pulp_wars-1wy.4`)

The AI step of the
[Martian balance revision](../product/RULESET_7_BALANCE_MARTIAN_ICE.md#9-normal-ai-changes)
(identity `7r37`, no rule and no identity change): Beam Down after a carrier
Move and for pick-ups, the passenger that shoots on arrival, the Saucer's
Tractor Beam, and the Mothership's free Heavy Tractor Beam are used on
purpose. Everything is behind `MartianPolicyOptionsV7.mobilityPlay`
(`setMartianPolicyOptionsV7`, tests and harnesses only); off, the policy
decides as the engine step `pulp_wars-1wy.3` did. The rules live in
`src/ai/v7-martian.ts` and the Martian helpers of `src/ai/v7.ts`; they read
the public view, the offered commands, and the public queries
(`queryTractorBeamPathV7`), add no PRNG use, no elapsed-time input, and no
work units, and run only in a match with a Martian seat.

As Martians:

- **Carriers by ratio.** A Saucer gains 10 while the army has more than
  three front units per Saucer (none before the first front unit) and
  otherwise costs 20; in a threatened city it still costs 30 and gets no
  bias (bodies first). The Mothership keeps its rule (30 when offered, one
  per six front units), now at 8 Coins. The Grunt's threatened-city bias
  (14) was rechecked for Attack 2 and 9 HP: the threatened city still trains
  Grunts (the existing test), so it is unchanged.
- **A shot on arrival** (Beam Down, 906; 1180 when the shot kills). A
  passenger that still has its primary action and may act after moving (a
  beamed unit counts as moved: a Grunt shoots at full Attack, a heat ray at
  half power, a Shield Projector not at all), has no attack where it stands,
  is not a Brain, is not a threatened garrison, and does not stand on a
  settlement center, is set down where a hostile unit is in its range that
  no Move of its own reaches. The landing is outside visible lethal reach
  and not further from the passenger's campaign job than it stands; a shot
  that does not kill lands within two tiles of another own land unit. Value:
  2 per point of the hit, the target's value when it dies, 6 more from two
  tiles or more (no retaliation), minus twice the danger.
- **Extraction** (Beam Down, 890: after every chip, before the delivery by
  route and every routine Move). A unit that has used its primary action
  and stands in visible lethal reach, not on a settlement center, is set
  down outside it; by its retained value, then the least danger. A carrier
  that still has its primary action flies to within pick-up range (two
  tiles) of such a unit when a tile next to its landing is safe for the unit
  and the landing for the carrier (891, the Saucer and the Mothership).
- **The Saucer's pull.** The pull is the Saucer's whole action, so its own
  attack no longer counts toward a kill (the engine step counted it, as for
  the Mothership of `7r36`). A pull into a kill (1181) or into half of the
  target's HP and Shield (1150) must add to what the own attacks deal where
  the target stands. Own units that have moved and may still attack (a
  Grunt, a ray at half power) count.
- **The Mothership's free pull** (1184: before its own Move toward a target,
  1175, and every attack). Its own attack counts after the pull, so it pulls
  a unit from two or three tiles next to itself and shoots it; the kill
  setup stays at 1181, the siege pull at 1347.
- **The siege pull, set up** (1346). A puller that can still pull after a
  Move flies to a tile within its beam's reach of a hostile city center
  held by a unit the beam may target, when an own capturer next to the
  center can still step on, the first tile of the pull is open land, and
  the landing is outside lethal reach. Then the pull (1347) and the
  capturer's step (the generic 1290).
- **Shooters keep their distance.** A routine Move of a Martian ground unit
  with range 2 that ends next to a hostile melee unit it does not stand
  next to now, and not on a settlement center, costs 8 (among equal Moves
  it takes the tile two tiles away). The step back (904) is unchanged.
- **The wait rule goes.** An unmoved Saucer with a Beam Down worth taking
  may fly (Beam Down no longer needs an unmoved carrier); the beam is still
  taken first.
- **Map curiosities.** No Beam Down sets a unit down on a visible Giant
  Spider's provoke tiles (the candidate filter of the curiosity policy, like
  a Move or a landing), and a carrier does not fly to extract a unit whose
  only safe landing is one.

Against Martians (every seat in such a match):

- **Pulls.** The guard against a pull (1245) covers Saucers and reaches five
  tiles (above).
- **Carriers.** A hostile Mothership is worth 8 more (a Saucer already is).

Tried and dropped (they lost or did nothing in the development samples):

- A **hover rule** for Saucers (staging plus the tiles two from a hostile
  unit near own shooters): the old policy won both games on three seeds of
  one 36-game mirror with it; without it the same sample came out 19 to 17.
  The Saucer keeps the staging rule.
- The **delivery in the danger estimate** (a visible hostile carrier counted
  as able to set a shooter down within its Move plus three of any tile,
  [section 9](../product/RULESET_7_BALANCE_MARTIAN_ICE.md#9-normal-ai-changes)
  of the design): in a 28-game mirror the policy with it won 14, without it 16. Units
  that count a shot from every Saucer everywhere hold back. Not adopted;
  the estimate is unchanged.

**Head-to-head, Martian mirror** (a scratch harness that sets `mobilityPlay`
per seat before each decision; Dry Land, round cap 150, every seed in both
seat orders; the user's small-sample rule). The acceptance sample, on seeds
the rules were not developed on (11 x 11 seeds 300-309, 14 x 14 seeds
300-307):

| Board   | Games | Decided | New policy | Old policy |
| ------- | ----: | ------: | ---------: | ---------: |
| 11 x 11 |    20 |      20 |         12 |          8 |
| 14 x 14 |    16 |      16 |          8 |          8 |
| Total   |    36 |      36 | 20 (55.6%) |         16 |

No round cap, error, stall, or rejection. The edge is small and inside the
noise of 36 games: a Martian mirror is mostly decided by the map (16 of the
18 seeds were won by the same seat in both orders; the new policy won both
games of the other two). The development samples on other seeds, with
intermediate rule sets, came out between 16 of 36 and 27 of 48 for the new
policy; the sample of 16 was the one that led to dropping the hover rule.
The new policy wins on what it was for:

| Per 36 seat-games (acceptance sample)  | New | Old |
| -------------------------------------- | --: | --: |
| Tractor Beams                          | 119 |  83 |
| ... by a Mothership (Heavy)            |  38 |  19 |
| ... of a defender off a hostile center |  20 |   6 |
| Hostile units pulled and killed        |  42 |  17 |
| Beam Downs                             | 274 | 141 |
| ... pick-ups away from a city          |  66 |  11 |
| ... extractions                        |  63 |   1 |
| ... after the carrier moved            | 100 |  34 |
| Passengers that attacked on arrival    |  38 |   8 |
| Kills                                  | 410 | 324 |
| Units lost                             | 336 | 414 |
| Cities captured                        |  94 |  85 |
| Saucers trained                        |  76 |  49 |
| Motherships trained                    |  23 |  17 |

**Coarse look against each faction** (the new policy on both sides, Dry
Land, 11 x 11 and 14 x 14, one seed each (300) in both seat orders, four
games per opponent; Martian wins): Human 2, Undead 3, Goblin 3, Dinosaur 3,
Ice Folk 3, Dwarf 2: 16 of 24 (66.7%). The old policy on both sides wins the
same 16 of 24 on those seeds. On the 36 cells of the mobility probe's
default run (11 x 11 seeds 0-1, 14 x 14 seed 0, six games per opponent) the
new policy wins 27 (Human 5, Undead 4, Goblin 6, Dinosaur 4, Ice Folk 5,
Dwarf 3) and the old policy 27 (5, 4, 4, 4, 5, 5); the probe itself won 26
there. Together 43 of 60 (71.7%) for the new policy: Martians are far above
the 60% line of the design with either policy, so the rules of `7r37` put
them there, not this pass. The measurement and any tuning are
`pulp_wars-1wy.6`; the first step of the design's fallback ladder is Grunt
HP 8.

**Parity.** Every rule is behind the Martian gate (a Martian seat, a
Martian viewer, or a unit with Beam Down or the Tractor Beam), so a match
without a Martian seat decides as before.

## Ice Folk play (`pulp_wars-7g3.4`)

Every Ice Folk heuristic lives behind one gate: the match has an Ice Folk
seat (`src/ai/v7-ice-folk.ts`, `iceFolkMatchForPolicyV7`), or reads a fact
that only such a match has (a Chill entry, a Snow or Blizzard tile flag, an
Ice Folk unit's ability). A match without an Ice Folk seat never evaluates
any of it: the [parity run](#ice-folk-measurements) is byte-identical. The
rules and their values are in `src/ai/v7-ice-folk.ts`; the policy
(`src/ai/v7.ts`) calls them from its existing scoring steps. They read only
the public view (`chilled`, the `snow` and `blizzard` tile flags, the
`iceFolk.shatterThreshold` of a visible unit's stats), the offered commands,
and the public previews (`queryCombatPreviewV7` with `shatters`, `sweep`,
`plantedApplied`, `fortificationIgnored`, `hiddenBlizzardPossible`, and the
option `assumeTargetChilled`), cached per decision. They add no PRNG use, no
elapsed-time input, and no work units. Values are in the policy's usual
units (a unit is worth its cost x 4 plus its HP).

Shared estimates (every match; all neutral without an Ice Folk seat):

- **Glide and deep snow.** A visible Ice Folk unit's reach (its threatened
  tiles) leaves known Snow at half cost (the Road rule; never the
  Sabretooth), and another faction's ground unit is stopped by known Snow
  (a Road edge waives it; Fieldcraft is assumed absent, as Forest freedom
  is). A Sabretooth's reach ignores zones of control and never ends on a
  settlement center it does not own.
- **Cities are threatened by the reach without Glide.** A unit's danger
  counts an Ice Folk unit's Glide, but the test of whether an own city is
  threatened uses the reach without it: with Glide every city near hostile
  Snow was threatened, and the policy trained and held its units at home
  instead of attacking ([measurements](#ice-folk-measurements)).
- **Rockfall** is in the reach only as the published range of a Yeti that
  stands on a Mountain. The reach from a Mountain a Yeti could walk to is
  left out: counting it made the policy too cautious and lost the
  head-to-head.
- **Engineering.** A hostile unit standing on a Mountain shows that its
  owner has Engineering, unless it needs none: a Martian walker or flyer, or
  a Mountain-born unit (a Yeti used to make every Ice Folk unit's reach
  cross Mountains).
- **Snow cover and the Blizzard.** The projected damage to an Ice Folk land
  unit on Snow with no fortification of its own has the x 1.5 cover (not
  added to Forest or Mountain cover); a shot from two or more tiles on one
  in the Blizzard of a visible Witch of its own seat is halved.
- **Shatter in every lethal-reach estimate.** A unit that the projected
  damage leaves at a visible Ice Folk melee unit's public Shatter threshold
  or below is in lethal reach when that unit can strike it from an adjacent
  tile next turn and it can be shattered then: it stays Chilled through its
  own End Turn (two turns left), or a visible hostile Witch is within four
  tiles of it (her Glide inside her own Blizzard, then Cold Snap range 2),
  or a visible hostile Sled within four (its Move, then Bolas range 2); a
  sluggish Witch or Sled reaches only its range. Never a `JUGGERNAUT`-role
  unit.
- **Values.** A visible hostile Witch is worth 12 more plus 4 for every own
  unit within two tiles of her (at most four), a Sled 6 more plus 4 when an
  own unit is within two tiles of it, a Mammoth 6 more (the Necromancer
  precedent).
- **Labels.** The Mammoth (`SWEEP`, labelled `DEFENDER`) and the Boulder
  Yeti (`BOULDERS`, labelled `SIEGE`) are line units
  (`policyTacticalRoleV7`, the Triceratops precedent): the Mammoth is not
  kept as a garrison, the Boulder Yeti needs no screen and no siege ring,
  and the volley bonus is not its. The Witch is never counted as a healer
  next to her target (she has no Tend Wounded).
- A ranged kill whose preview is flagged `hiddenBlizzardPossible` and that
  the halved hit would not make is scored as a chip, not a kill.

As the Ice Folk:

- **Production.** The Sled, the Mammoth, the Witch, the Snow Hunter, the
  Boulder Yeti, and the Sabretooth gain 10 as the first of their role. In a
  threatened city the Yeti gains 12 and the Sled and the Witch are worth -30
  (bodies first); in the preferred role the Yeti's repetition costs 5 a unit
  instead of 8. A Sled gains 6 while there is fewer than one per three front
  units (Yetis, Snow Hunters, Mammoths, Boulder Yetis, Sabretooths, the
  Frost Giant) and at least two, otherwise it costs 20; a Mammoth gains 6
  while there is fewer than one per two other front units, otherwise it
  costs 20; the Witch gains 20 at war with three front units and no Witch
  (a second one with eight front units per Witch), otherwise she costs 20; a
  Boulder Yeti (one per three front units) and a Sabretooth (one per six)
  gain 30, so they are bought when offered.
- **Research.** Drill and Scouting (the Mammoth and the Sled) at 1062, just
  above the role plan; with two cities Administration and Marksmanship at
  1170 (the Dinosaur signature priority); Deep Winter (1150) once the seat
  owns two cities or has a wounded unit within two tiles of an own center;
  Brittle (1150) once it has Deep Winter and owns a Chill source; then
  Sawmilling and Chivalry (the shorter chain first; 1150 with five front
  units, 1062 before). The free opening technology keeps the existing
  scorer.
- **The Witch.** She takes the Pressure job like any unit (the campaign
  plan already gives her one and counts her in the wave at home). Her Move
  (1296, first in the turn) goes to her best destination by this key: not
  into visible lethal reach; the most own land units other than Witches
  within 1; not adjacent to a visible hostile unit; the most hostile land
  units within Cold Snap range; the route progress toward the wave's target;
  the least danger. She moves only when a destination is strictly better
  than her tile, never out of a wave that has not formed, and makes no other
  routine Move. Cold Snap (1295) is cast whenever it is offered, before
  every attack, worth 6 per target that becomes sluggish and 3 per refresh.
- **The Bolas** (the spec's target rule): on a hostile unit that some own
  unit's offered attack would shatter once Chilled (the offered attacks'
  previews with `assumeTargetChilled`, the shatter set-ups of
  `previewBolasV7`), the most valuable first, at 1293 (after Cold Snap,
  before every attack); else on a hostile unit that is not Chilled and can
  reach and attack an own unit next turn, the highest projected damage
  first, at 1186 (above ordinary kills), unless the Sled has a kill of its
  own; else none. Never on a unit that is already Chilled or that an own
  Witch's offered Cold Snap covers this turn.
- **Chill, then Shatter.** A Shatter kill gains 4 (no Grave, no blast). A
  hit that does not kill a Chilled unit but leaves it at the threshold or
  below, when another offered attack then kills it (the lethal follow-up
  test, which previews the Shatter) and no own attack kills it outright now,
  goes at 1179 (above every chip) and gains half the target's value. Chips
  (900) go in the spec's order: Snow Hunters (903, Cold Blood), Mammoths
  (902, Sweep), the other units (901), Sleds (900).
- **Sweep, Boulders, the Sabretooth.** A Mammoth's attack gains 8 when it
  tramples Field Defense and 6 per flank victim it leaves Chilled in the
  window for another offered attack (the flank damage and kills are the
  generic splash values). An unmoved Boulder Yeti with an offered attack
  makes no routine Move (the planted throw); its hit gains 3 per
  fortification level ignored. A Sabretooth's kill gains 8 on a ranged,
  siege, or support unit and 4 on a unit with no friend next to it; it
  never moves into visible lethal reach unless it can strike from there (a
  kill or a survivable hit) or it is no worse, and its attack that neither
  kills nor leaves it alive is not a candidate (the Vampire rule).
- **Moves.** The objective (route progress) of an Ice Folk unit's Move is
  scaled by 8 and gains 4 within 1 of an own Witch, 2 on Snow, and 1 for a
  Yeti on a Mountain within Rockfall range of a visible hostile unit: these
  decide only at equal progress. A wave made only of Mountain-born units
  routes over the Mountains; a Mountain-born unit marching with any other
  unit keeps the shared route.

Against the Ice Folk (every seat in such a match):

- **The Witch first.** A kill on a hostile Witch goes at 1182 (above every
  other kill). When this turn's offered attacks on her (each attacker's best
  hit, at least two attackers) reach her HP, each hit on her that does not
  kill goes at 1179 (ranged, no retaliation) or 1178, gains 10, and is never
  rejected as harmful.
- **Sluggish units.** A sluggish own unit with an offered attack makes no
  routine Move (it attacks from where it stands); without one it moves only
  when the Move ends outside the melee reach of the visible Ice Folk units,
  makes route progress with no visible hostile land unit within three
  tiles, or leaves a visible Witch's two tiles.
- **Cold Snap reach.** A unit of another faction makes no routine Move
  without route progress from outside into four tiles of a visible hostile
  Witch.
- **The Shatter window.** A unit that only a Shatter kills where it stands
  (lethal reach with the Shatter rule, not without it) steps to a tile out
  of lethal reach (935, above the half-HP Recover). An attack whose
  retaliation leaves a Chilled or chillable attacker where a visible Ice
  Folk melee unit's next hit would shatter it costs half the attacker's
  value.
- **Hostile Snow.** A fragile unit (ranged, siege, support, or below half
  HP) pays 3 for ending a routine Move on hostile Snow (a hostile Ice Folk
  territory or a Blizzard).

Not covered: the Goblin rule (a goblin-crewed unit that will be sluggish
takes its Kaboom now) and the Martian note (no Shield against Chill: the
Shield-aware danger already ignores Chill, which is not damage). The Frost
Giant uses the generic Juggernaut play.

### Ice Folk measurements

All on Dry Land, Normal against Normal, Rival mode, the balance-testing
policy's coarse samples, at `pulp-wars-poc-7r25` (the leave-one-out runs at
7r24, before the Martian coarse balance; the Ice Folk numbers are the same
in both). "Generic" is the policy of `9519700` (the ordinary policy on the
Ice Folk registration); "Ice Folk" is this policy. The runs used a scratch
harness that loads both policies over the same engine and gives each seat
its own policy; nothing in the shipped policy switches.

**Head-to-head, Ice Folk mirror** (the Ice Folk policy on one seat, the
generic one on the other, every seed in both seat orders):

| Board   | Seeds | Round cap | Decided | Ice Folk policy | Generic |
| ------- | ----: | --------: | ------: | --------------: | ------: |
| 11 x 11 |  0-59 |       120 |     120 |              75 |      45 |
| 14 x 14 |  0-29 |       150 |      60 |              32 |      28 |
| Total   |       |           |     180 |       107 (59%) |      73 |

On fresh seeds (11 x 11, 60-119, at 7r24) it won 67 of 120. The edge is
mostly on 11 x 11, where most games are decided by round 15.

**Leave-one-out** (11 x 11, seeds 0-59, 120 games each, at 7r24, with
every rule of the final policy but one; the full policy won 64 there before
the Rockfall reach was dropped): without the Rockfall reach 75 (so it was
dropped), without the Bolas 59, without the Glide in unit danger 58,
without the Mountain-born wave route 58, without the production rules 61;
without the research, attack, Witch and Cold Snap, Move, estimate,
Engineering, line-unit, or counterplay rules 64 to 67, within the noise of
the sample (about 5 games). On 14 x 14 (seeds 0-29, 60 games each, full
policy 32) the Bolas and the Move rules (28 without each) were the clearest
contributors and the Witch's rules neutral (33 to 35 without). An earlier
40-game run with Glide in the threatened-city test won 12 of 40 against 28
(21 of 40 without it), which is why cities ignore Glide.

**Usage** (the Ice Folk policy's seats in the 180-game head-to-head; in
brackets the generic policy's): units trained: Yeti 1,095 (861), Sled 428
(515), Mammoth 388 (546), Witch 112 (41), Snow Hunter 97 (24), Boulder Yeti
68 (71), Sabretooth 32 (0); seats that trained a Witch 68 of 180 (30), a
Snow Hunter 51 (16), a Mammoth 131 (119). Chills applied: Bolas 794 (0),
Cold Snap 450 in 335 casts (0), Cold Aura 397 (276). Shatter kills 294
(40), by what brought the victim into the window: earlier damage 146, a Yeti
hit 92, another hit 34, a Snow Hunter shot 11, a Boulder 6, a Sweep flank
4, a charging Sled at full HP 1; 201 Bolas were followed by a Shatter
within the thrower's next turn. Sweep: 523 Mammoth attacks with 114 flank
hits. Rockfall shots 513 (333), 40 kills. Witches: 112 trained, 21 killed,
91 alive at the end (generic: 41, 22, 19). Kills and losses 1,326 and 1,182
(1,086 and 1,405).

**Against each faction** (this policy on both sides, seeds 0-14 in both
orders on 11 x 11 and 0-9 on 14 x 14, Ice Folk wins first; in brackets the
generic policy on both sides, 11 x 11):

| Opponent  | 11 x 11 | 14 x 14 | Total       | Generic 11 x 11 |
| --------- | ------: | ------: | ----------- | --------------: |
| Humans    |    21-9 |    13-7 | 34-16 (68%) |           17-13 |
| Undead    |   20-10 |    12-8 | 32-18 (64%) |           16-14 |
| Goblins   |    23-6 |    14-6 | 37-12 (76%) |            23-7 |
| Dinosaurs |    24-6 |    12-7 | 36-13 (73%) |            23-7 |
| Martians  |    24-6 |    11-9 | 35-15 (70%) |            20-9 |

Goblins and Dinosaurs (and Martians on 11 x 11) are beyond 70/30, as they
already were under the generic policy; the numbers are the balance bead's
(`pulp_wars-7g3.7`, which gave the Yeti 9 HP and Defense 1.5 at `7r27`: 52%
to 57% against every faction in the
[Ice Folk balance report](../validation/RULESET_7_ICE_FOLK_BALANCE.md)). The counterplay rules ("against the Ice Folk") were
measured by the same matchups with and without them for the other seat:
the other factions won 73 of 247 decided games with them and 67 of 249
without, a slight tendency.

**Parity.** 45 matches without an Ice Folk seat (Human-Undead,
Goblin-Dinosaur, Dinosaur-Human, Undead-Goblin, Martian-Human,
Martian-Dinosaur, and the Martian mirror on 11 x 11, seeds 0-5;
Human-Goblin-Dinosaur on 14 x 14, seeds 0-2) end in the same state hash
after the same number of accepted commands under both policies. The
Engineering fix can change a match with a Martian walker or flyer on a
Mountain (it no longer implies Engineering); none of the 18 Martian matches
changed.

**Cost.** The checked late public view decides in about 5 ms under either
policy, and an Ice Folk view at round 18 of a 14 x 14 match in about 15 ms
under either. The longest synchronous decision in the head-to-head runs was
374 ms on a loaded machine (four matches in parallel); the most accepted
commands in one turn was 87 (an Ice Folk-Dinosaur match on 14 x 14), below
the 128-command cap.

## Dwarf play (`pulp_wars-78i.4`)

Every Dwarf heuristic lives behind one gate: the match has a Dwarf seat
(`src/ai/v7-dwarf.ts`, `dwarfMatchForPolicyV7`), or reads a fact that only
such a match has (a mound in `view.burrowed`, the `dwarf` block of the public
unit stats, a `bombedThisTurn` entry). A match without a Dwarf seat never
evaluates any of it: the [parity run](#dwarf-measurements) is
byte-identical. The rules and their values are in `src/ai/v7-dwarf.ts`; the
policy (`src/ai/v7.ts`) calls them from its existing scoring steps. They read
only the public view, the offered commands, and the public previews
(`previewBombRunV7` with its `landingThreat`, `previewAssembleV7`,
`queryCombatPreviewV7` with `push`), cached per decision. The tunnel preview
is never used: its eruption is a forecast (`projected`), so the policy
scores destinations from the visible units and never counts an eruption as
damage dealt. They add no PRNG use, no elapsed-time input, and no work
units. Values are in the policy's usual units (a unit is worth its cost x 4
plus its HP).

**The switch.** `DwarfPolicyOptionsV7` has three groups: `dwarfPlay` (the
Dwarf seat's own rules), `againstDwarves` (every seat's estimates of Dwarf
units and the counterplay), and `expansionTunnel` (the optional Mole rule 5
of the spec). The shipped policy plays the first two; the third is off
because its head-to-head was neutral. With the first two off, the policy
decides exactly as the generic policy of `78i.3` did (the
[measurements](#dwarf-measurements)); the head-to-head harness and the tests
set the switch with `setDwarfPolicyOptionsV7`, nothing else does.

Shared estimates (every seat in a match with a Dwarf seat):

- **Mounds.** A ground unit (or an Egg's nest tile) next to a hostile Mole
  mound takes its eruption (2, 3 with Blasting Charges, the public
  `dwarf.eruptionDamage`) at the Dwarves' next Start Turn, and every tile
  within 2 of a hostile mound is in its unit's surfacing reach (it comes up
  fresh: Move 1 and an attack). Both are in a unit's visible danger.
- **Gyrocopters.** A visible hostile Gyrocopter that is not sluggish
  threatens one bomb (its owner's public `bombDamage`) on every tile within 2
  of it, once per unit (the largest, whatever the number of Gyrocopters).
- **Plated, Unflinching, Dig In.** A projected hit on a Steam Tank is
  capped at its public `plated`; a construct attacks with its maximum HP; a
  dug-in Hammerer or Mole (the public `dwarf.dugIn`) that stays where it
  stands has the Field Defense level (never stacked with Field Defense, and
  never after a planned Move). Attack decisions use the exact previews,
  which carry all three.

As the Dwarves:

- **The Mole** (one planned `TUNNEL` per Mole; every other offer is pruned
  before scoring, so the large offer list costs one cheap score per
  destination):
  1. _defence:_ a Mole within 2 of an invader (a visible hostile land unit
     within 2 of an own center) walks and hits; one 3 or 4 tiles from an
     invader tunnels (1150) to the offered destination next to it with the
     best eruption score;
  2. _offence:_ on a Pressure job whose wave has set out, with a route of 4
     or more steps (or a route blocked by terrain), it tunnels (875, above
     the routine Moves and below the chips) to the destination with the
     best eruption score (2 for each visible hostile ground unit next to
     it, 3 more for each `CATAPULT`, `MARKSMAN`, or `CAPTAIN`-role one) plus
     the route progress; a destination next to three or more hostile melee
     units is skipped unless it is next to the target's center, and one
     that erupts on nobody must make two steps of progress and stay within
     3 of another own land unit (the Mole surfaces next to its wave);
  3. _rider:_ it takes an adjacent fresh Hammerer when a rider tile is
     offered (never the garrison of an own center with a hostile unit
     within 3), on the rider tile next to the most hostile land units, the
     back-liners first; a Hammerer gains 2 for ending a routine Move next to
     an own Mole;
  4. _after surfacing_ both use the ordinary attack choice;
  5. it never tunnels off an own city center with no other own land unit
     next to that center.
- **The Gyrocopter** (one planned `BOMB_RUN` per Gyrocopter): each offer is
  scored by `min(bombDamage, target HP)`, plus 10 when it kills, plus 6 on a
  `CATAPULT`, `MARKSMAN`, or `CAPTAIN`-role target, minus **half** the
  landing threat; the best three by the policy's own danger estimate are
  previewed exactly (`previewBombRunV7`), and the best above zero is taken.
  It never lands where `landingThreat` is 8 or more unless the bomb kills a
  `CATAPULT` or `CAPTAIN`-role unit. A bomb that leaves its target within one
  offered hit of death goes before every kill (1185); one that kills goes
  after the chips (895); any other at 880. A Gyrocopter never ends a routine
  Move on water or into visible lethal reach that is worse than where it
  stands; otherwise it takes the ordinary scout and Pressure jobs.
- **The Gunner:** an unmoved Gunner with an offered attack makes no routine
  Move (it fires twice where it stands); its chips go at 902, after the bombs
  and before the melee chips.
- **The Engineer:** `ASSEMBLE` on a Pressure job or within 3 of a visible
  hostile unit, on the offered tile nearest the target (the job's city, or
  the nearest hostile unit) that is not next to a visible hostile melee
  unit, at the land-production priority (1205 at war while units are
  short, otherwise 1080), one higher when the home city is more than 4
  tiles from the target; the savings plan holds it like training. Repair
  restores machines 4 and others 2 and values HP on a construct double; with
  3 or more HP on machines it goes at 905, before the chips. Its Moves gain
  1 per missing HP of an adjacent own construct and pay 6 next to a visible
  hostile melee unit.
- **Dig In:** a dug-in Hammerer or Mole with a visible hostile land unit
  within 3 makes no routine Move (its attacks are unchanged).
- **The Steam Cannon** plays like a Catapult; a shot whose Knockback pushes
  a unit off a hostile center gains 8, off Field Defense 4, and 2 for each
  own melee unit next to the push tile (at most three).
- **Production.** The Mole, the Gunner, the Engineer, the Cannon, and the
  Tank gain 10 as the first of their role. In a threatened city the
  Hammerer gains 12 and the Mole 6, and the Gyrocopter and the Engineer cost 30. The Hammerer's repetition costs 5 a unit instead of 8. A Mole gains 6
  while there is fewer than one per three other front units, otherwise it
  costs 20. The first Gyrocopter gains 4 at war with four front units, and
  further ones are valued as usual up to one per five front units
  (otherwise they cost 20). The Engineer gains 16 at war with four front
  units once it has work (Marksmanship for Assemble, or two machines to
  mend), a second one with eight front units per Engineer, otherwise it
  costs 20. A Cannon beyond one per four front units costs 20. The Tank
  comes through the savings plan.
- **Research** (the free opener keeps the existing scorer): Drill at 1062
  (just above the role plan); Dig In at 1150 once a visible hostile unit or
  mound is within 3 of an own center; with two cities Marksmanship at 1170
  and Raiding (Dive) once the seat owns a Gyrocopter; Administration at 1150
  once it owns a Gunner or two Moles; Scouting at 1062 with four front
  units; Blasting Charges at 1150 against a visible Walled city or a Martian
  seat; then Sawmilling and Chivalry (1150 with five front units, 1062
  before).

Against the Dwarves (every seat):

- **Mounds.** A ground unit never ends a routine Move next to a hostile Mole
  mound whose eruption kills it (HP plus Shield at most the eruption); a
  ranged or siege unit pays 3 for ending one in a ring; a unit the next
  eruption kills where it stands steps out of every ring (935, the
  Shatter-escape tier) to a tile with less visible danger.
- **Targets.** A visible Engineer is worth 6 more plus 4 for each construct
  of its owner within 2 of it (at most three); a Gyrocopter that landed next
  to an own unit 6 more.
- The surfaced pair and dug-in units need no rule: the exact previews show
  that a surfaced unit abroad is not dug in, and the harmful-attack test
  already rejects a hit on a dug-in unit that achieves nothing.

Not covered: the Brass Titan uses the generic Juggernaut play with the
construct estimates; the Steam Tank the generic Knight play (it has no
Overrun).

### Dwarf measurements

All on Dry Land, Normal against Normal, Rival mode, the balance-testing
policy's coarse samples, at `pulp-wars-poc-7r30`. "Generic" is the policy of
`087edb2` (the ordinary policy on the Dwarf registration, the `78i.3`
baseline); "Dwarf" is this policy. A scratch harness loads one policy module
and sets the switch before each seat's decision; with both groups off it
reproduces the `087edb2` policy byte for byte (6 Dwarf matches, 4 Dwarf
mirrors and 2 against Humans, against a copy of the `087edb2` policy).

**Head-to-head, Dwarf mirror** (the Dwarf policy on one seat, the generic
one on the other, every seed in both seat orders, with
`allowDuplicateFactions`):

| Board   | Seeds | Round cap | Decided | Dwarf policy | Generic |
| ------- | ----: | --------: | ------: | -----------: | ------: |
| 11 x 11 |  0-29 |       120 |      60 |           35 |      25 |
| 14 x 14 |  0-14 |       150 |      30 |           15 |      15 |
| Total   |       |           |      90 |     50 (56%) |      40 |

The first draft lost (30 of 64 on 11 x 11): it trained 112 Gyrocopters and
97 Engineers in 64 seat-games (the generic policy trains neither) and pushed
Scouting with Drill. Leave-one-out on 11 x 11 (64 games each) showed the
tunnels (25 of 64 without them) and the bombs (27 without) winning and the
production and research rules losing (40 of 64 without the production rules);
the production and research above are the second draft (35 of 64, then 37
with half the landing threat). On 14 x 14 no single group moved the result
beyond the noise (14 to 16 of 30 without production, Dig In hold, or
research). Most seeds are won by the same seat in both orders.

**Measured deviations from the spec's rules:**

- The bombing-run score subtracts **half** the landing threat. With the whole
  threat the Gyrocopters bombed 14 times in 64 seat-games (34 of them had a
  Gyrocopter: the 4-Coin scout of spec concern 5); with half of it 73 times,
  winning 37 of 64 against 35. The hard limit of 8 stands.
- **The optional expansion tunnel** (Mole rule 5) is implemented behind the
  switch and **dropped**: against the same policy without it, 21 of 40 on
  11 x 11 (seeds 0-19) and 10 of 20 on 14 x 14 (seeds 0-9), 31 of 60. It
  added about 11 tunnels in 60 seat-games and no city by round 15 (125
  cities at round 15 with and without it).
- **The "against the Dwarves" group is kept although it is neutral on wins**
  (the second-pass precedent: neutral and it moves the measured problem).
  In the 144 coarse-matchup games below, the other factions won 72 with it
  and 72 with the generic policy (70 games differed, 6 outcomes flipped, 3
  each way), and killed 50 Engineers (in 23 of 55 seat-games with one)
  against 37 (19 of 52).

**Telemetry** (the Dwarf policy's 90 seat-games of the head-to-head; in
brackets the generic policy's): units trained: Hammerer 764 (995), Mole 277
(218), Engineer 79 (0), Gyrocopter 56 (0), Gunner 56 (55), Tank 53 (31),
Cannon 35 (99); seat-games with a Gyrocopter 45, an Engineer 36, a Gunner 33. Tunnels 184 (89 with a rider; in 58 seat-games, with a rider in 37);
eruptions 184, 131 hitting someone, 496 HP of damage, 3 kills; surfaced
Moles and riders lost before their owner's next turn 34. Bombing runs 88
(in 37 seat-games), 345 HP, 13 kills; Gyrocopters lost after a bomb 11.
Assembles 154 (in 26 seat-games); Repairs 65 restoring 227 HP; Gunner shots
615, 235 of them second shots. Dig In: 624 dug-in unit-turns at the end of
the seat's turns (126); attacks on dug-in Dwarf units 163 by the generic
seat, 89 by the Dwarf one. Cities at round 15: 189 (191).

**Against each faction** (this policy on both sides, seeds 0-7 in both
orders on 11 x 11 and 0-3 on 14 x 14, round cap 150, Dwarf wins first):

| Opponent  | 11 x 11 | 14 x 14 | Total | Eruption kills | Bomb kills | Engineers killed |
| --------- | ------: | ------: | ----- | -------------: | ---------: | ---------------: |
| Humans    |     8-8 |     5-3 | 13-11 |              0 |          5 |           4 of 9 |
| Undead    |    10-6 |     4-4 | 14-10 |              1 |          4 |           4 of 9 |
| Goblins   |     8-8 |     2-6 | 10-14 |              1 |          5 |           6 of 9 |
| Dinosaurs |     8-8 |     6-2 | 14-10 |              0 |          0 |          4 of 10 |
| Martians  |     9-7 |     2-6 | 11-13 |              0 |          1 |          2 of 10 |
| Ice Folk  |     7-9 |     3-5 | 10-14 |              0 |          2 |           3 of 8 |

("Engineers killed": seat-games in which the opponent killed an Engineer,
of those in which the Dwarves trained one.) No pairing is beyond 70/30
(the widest are 14-10 and 10-14); no stalls, policy errors, or round caps.
For the balance bead (`pulp_wars-78i.7`): eruptions almost never kill
(2 kills in 296 eruptions; none against four factions), bombs never killed a
Dinosaur unit, the opponents kill Engineers in fewer than half of the
seat-games with one (Martians 2 of 10), and Gyrocopters scored 17 kills for
31 losses after a bomb (0.55 per loss, above the 0.3 watch band).

**Parity.** 26 matches without a Dwarf seat (Human-Undead, Goblin-Dinosaur,
Martian-Ice Folk, Dinosaur-Human, Ice Folk-Goblin, and Undead-Martian on
11 x 11, seeds 0-3; Human-Goblin-Dinosaur on 14 x 14, seeds 0-1) end in the
same state hash after the same number of accepted commands under this policy
and the policy of `087edb2`.

**Cost.** On 60 Dwarf views with 40 or more Tunnel and bombing-run offers
(Dwarf mirrors on 14 x 14, at most 518 Tunnel offers in one view) a
synchronous decision takes 2.3 ms at the mean and 5.4 ms at most under the
Dwarf policy, against 2.9 and 6.3 ms under the generic one (which scores
every offer). The retained late view
(`npx tsx scripts/benchmark-ruleset-v7-normal-policy.ts`) decides the same
command with the same hash in about 3 ms (synchronous) and 20 ms in 8 ms
slices. In the measurement runs (378 games, four matches in parallel) the
longest decision was 189 ms. No Dwarf rule brought a turn to the
128-command cap; one 14 x 14 Dwarf-Human match (seed 3) reached it in rounds
71 and 72, on both seats, through the generic `REDEVELOP` and
`BUILD_LUMBER_CAMP` pair repeated on one tile (the issue noted under the
[Martian measurements](#martian-measurements), since fixed by
[`pulp_wars-9s0.9`](#the-redevelop-and-rebuild-cycle-pulp_wars-9s09)).

## Candy play (`pulp_wars-jdb.4`)

The Candy rules of
[the Candy contract, section 14](../product/RULESET_7_CANDY.md#14-normal-ai-requirements)
live in `src/ai/v7-candy.ts`. Every rule is gated on a match with a Candy
seat and reads only the public view (`sugarRush`, `crumbs`, the `candy` stat
block), the offered commands, and public previews. `CandyPolicyOptionsV7`
switches each group on and off; with all off the policy decides as the
`pulp_wars-jdb.3` policy, decision for decision (checked over six matches
with Candy seats, 1,573 decisions, against a copy of that policy; and with
the default options over three matches without a Candy seat, 981 decisions).

As the Candy (an own unit of Candy kind):

- **Sugar Rush** (`rush`). A plan per offered `SUGAR_RUSH`, only for a unit
  with a visible hostile unit within its Move + 1 + range or a threatened own
  center in Rushed reach:
  1. _kill_ (1179, or 1279 against a unit that threatens an own city, so the
     plain kills of the tier go first): the exact preview of the Rushed
     attack (`assumeSugarRush`, from the unit's tile or the end of a Rushed
     Move) kills a target that no plain plan of the unit kills, and the unit
     does not end in visible lethal reach (the danger estimate without the
     dead target) unless the target is a `CATAPULT`, `CAPTAIN`, or `KNIGHT`
     role. A Chocolate Bunny also needs a Sugar Frenzy target next to its new
     tile, or a key kill. A target another Rushed own unit is about to kill
     is left to it. The plan's Move then has the kill tier (1180 or 1280),
     and the kill follows by the ordinary score;
  2. _city_ (1251): the Rushed Move reaches a threatened own center with no
     own unit on it that the plain Move cannot;
  3. _home_ (one above the attack's tier): with Home Sweet Home, an offered
     attack that leaves the unit on or next to an own center (never for a
     Confectioner, and never for a chip of a unit below half its HP, which
     recovers instead).
     The defender of a threatened own center never leaves it for a plan.
- **The Crash** (`crashRetreat`). A Crashed unit next to a visible hostile
  melee unit moves to a tile with less visible danger (935) or holds; any
  other Crashed unit makes no routine Move into more danger than where it
  stands.
- **Re-bake** (`rebake`). The one best offered Re-bake per Confectioner
  (the dearest role, the lowest `turnsLeft`, then `(y, x)`) at 1265, before
  `TRAIN`; never where the copy would stand in visible lethal reach with no
  own center next to it and no own fighting unit beside it. A Confectioner
  with no offered Re-bake walks (1176) next to the best affordable own Crumbs
  within 3, or a step closer when they last another turn, never into
  visible lethal reach.
- **Pie first** (`pieFirst`). A Pie Launcher's chip that Splats a target an
  own unit has an offered adjacent attack on goes 3 above its tier and is
  worth the retaliation those attacks would take.
- **Sugar Toss** (`sugarToss`). The one best target per Gunner (the highest
  role cost, a Golem counts 12; the lowest HP; the lowest ID): at 905 when
  every offered attack of the Gunner neither kills nor deals 3 and none is
  on a unit that threatens an own city, at 650 when it has no offered
  attack.
- **Production** (`production`): the first Marshmallow, Gunner, Confectioner,
  Pie Launcher, and Chocolate Bunny gain 10; in a threatened city the Toffee Trooper
  gains 12 and the Confectioner and the Pie Launcher cost 30; a Confectioner
  beyond one per six front units and a Pie Launcher beyond one per four cost 20.
- **Research** (`research`; the free opener keeps the existing scorer):
  Drill when a hostile unit is in sight, else Marksmanship (1062); Home Sweet
  Home once a visible hostile unit is within 3 of an own center (1150);
  Administration at two cities and Sawmilling against a visible Walled city
  or at three cities (1150); then Drill, Chivalry, and Peppermint Surprise
  (1062).

Against the Candy (every seat):

- **The Crash** (`readCrash`): a Crashed hostile unit adds nothing to the
  danger estimate, and wins a tie of the attack score (1).
- **Crumbs** (`eatCrumbs`): a routine Move that is no step back gains 2 on
  its objective value for ending on hostile Crumbs, unless the bite kills,
  the tile is in visible lethal reach after it, or the bite is taken for a
  role that costs less than 4 or takes half the eater's HP.
- **Bounce** (`respectBounce`): a melee attack whose preview says
  `WILL_BOUNCE` loses 1.
- Confectioners are hunted by the existing support hunt.

Not covered (open, with no bead yet;
[current rules, known discrepancies](../product/RULESET_7_CURRENT.md#25-known-discrepancies)):
the wave plan still counts Crashed units; Marshmallows and the
Golem use the generic Guard and Juggernaut placement. The projection of a
moved unit (`projectPublicUnits`) now drops the `SUGAR_RUSH` Attack
modifier with the bonus it recomputes without, so the exact preview adds it
back under the first-attack rule (the Knight sequence planner of a Rushed
Chocolate Bunny reads it).

### Candy measurements

Dry Land, 11 x 11, Normal against Normal, Rival mode, at `pulp-wars-poc-7r38`,
small samples by the balance-testing policy. A scratch harness sets the
switch before each seat's decision; every seed is played in both seat
assignments.

**Head-to-head, Candy mirror** (this policy on one seat, the `jdb.3` policy
on the other, `allowDuplicateFactions`): seeds 0-19, 40 games, **27 to 13**;
the final code again on seeds 0-14, 30 games, **21 to 9**. In those 30 games
the Candy policy Rushed 213 times with 192 Rushed attacks, Re-baked 5 times,
Tossed 13 times, and Splatted 44 times. After the merge with `7r39` (the
Grunt at 8 HP and the siege of a single-file front), seeds 0-9, 20 games:
**13 to 7**.

**Leave one group out** (the whole policy against the policy without the
group, Candy mirror, seeds 0-14, 30 games each; wins of the whole policy
first):

| Group left out          | Result  | Decision                                |
| ----------------------- | ------- | --------------------------------------- |
| `rush`                  | 18 – 12 | kept                                    |
| `production`            | 17 – 13 | kept                                    |
| `research`              | 17 – 13 | kept                                    |
| `pieFirst`, `sugarToss` | 16 – 14 | kept                                    |
| `eatCrumbs`             | 16 – 14 | kept                                    |
| `respectBounce`         | 16 – 14 | kept                                    |
| `readCrash`             | 15 – 15 | kept (neutral; the contract's rule)     |
| `rebake`                | 14 – 14 | kept (neutral; 8 Re-bakes in 30 games)  |
| `crashRetreat`          | 14 – 16 | kept (inside the noise; the contract's) |
| Rush bonus in danger    | 11 – 18 | **dropped**                             |

The dropped rule added the Rush bonus (+1 Attack) of every free hostile
Candy unit to the danger estimate; it was not in the contract, made every
seat too timid against the Candy, and is removed from the code.

**Against the Candy, a Human seat** (seeds 0-14, both seat assignments,
against this Candy policy): 14 of 30 with the three "against" rules, 15 of 30 without them: neutral on wins (the second-pass precedent: kept as the
contract's rules).

**Candy against each faction** (this policy on both seats, seeds 0-2 in
both seat assignments, 6 games each; in brackets the `jdb.3` policy on the
Candy seat): Humans 2 (2), Undead 5 (1), Goblins 2 (2), Dinosaurs 3 (1),
Martians 2 (1), Ice Folk 3 (1), Dwarves 3 (1): **20 of 42** (9 of 42). A
sanity sample, not a balance result. No match stalled,
none had a rejected command, and the longest turn had 59 accepted commands.
The coarse balance bead (`pulp_wars-jdb.7`) was closed on this sample at the
user's direction, with no number changed
([balance record](../product/RULESET_7_CANDY.md#195-balance-record-pulp_wars-jdb7));
it predates the Grunt's 8 HP of `7r39`, the village density of `7r40`, and
the 3 starting Coins and tier 3 base cost of 9 of `7r41`.

## The naval branch (`pulp_wars-5ti.2` and `5ti.3`)

**Status: legal, not clever.** The two engine steps of the
[naval branch](../product/RULESET_7_NAVAL_BRANCH.md) (folded into
[current rules section 14](../product/RULESET_7_CURRENT.md#14-naval-rules)
and [section 21.16](../product/RULESET_7_CURRENT.md#2116-the-frozen-sea) by
`pulp_wars-5ti.9`) changed the policy only where it had to stay correct.
The play the overlay asks for is two open beads.

What the policy does today (`src/ai/v7.ts`):

- **Submarines count as naval units** for the two-ship training cap of the
  naval plan; the plan never asks for one. A seat may still research
  Seamanship or Submersibles, train a Submarine, ram (by moving a Patrol
  Boat and then attacking), or pick an offered `BOARD` as its general
  scoring happens to; nothing values them on purpose.
- **An Ice Folk seat makes no naval plan** (it has no ships and cannot
  embark) and **`FREEZE` is never a policy candidate**, so it does not
  cross water on purpose. Its units reach what they can walk to, ice that
  exists included: an offered Move onto ice is an ordinary candidate, and
  its slide is the engine's.
- **Estimates.** Every seat's threat estimate treats known ice as ground
  for a land-form unit and closed to a unit afloat, ends a slipping unit's
  reach on the first ice tile, and gives an icebound unit no threat (it
  cannot move or attack). It does not follow an Ice Folk unit's slide (the
  unit walks the ice in the estimate), so its reach on ice is understated.
- **Dry Land is unchanged:** nothing of the branch is offered there.

Checks: `tests/unit/ruleset-v7-naval-branch-headless.test.ts` (short water
matches of every faction and a Showcase finish without an error, a stall,
or a rejected command) and `tests/unit/ruleset-v7-frozen-sea-headless.test.ts`
(the same for the Ice Folk against every faction, with no ship).

Open:

- **`pulp_wars-5ti.4`, the seafaring seats**
  ([overlay section 13.1](../product/RULESET_7_NAVAL_BRANCH.md#131-seafaring-seats-bead-5ti4)):
  research of Seamanship and Submersibles, Submarine training against
  visible Battleships, the Ram read from the preview, Board valued against
  the best attack, Submarine targets and safety, and the Submerged and
  torpedo threat estimates. Each rule comes with a modest head-to-head
  test, as the user asked for every change of AI strategy.
- **`pulp_wars-5ti.5`, the frozen sea**
  ([overlay sections 13.2 and 13.3](../product/RULESET_7_NAVAL_BRANCH.md#132-the-ice-folk-bead-5ti5)):
  the Ice Folk ice plan (crossings, builders, the wave, Icebound, home
  ice) and every seat's play against the ice (landings off enemy ice,
  ships out of Freeze reach, slide reach in the threat map). Until it
  lands an Ice Folk seat stays on its own landmass on Continents and
  Archipelago.
- The coarse balance on water maps (`pulp_wars-5ti.8`) waits for both.

## The Rift (`pulp_wars-9s0.5`)

The policy plays the [Rift](../product/RULESET_7_RIFT.md) through the
public queries, which offer only legal Moves, attacks, and abilities, so
no unit is ever told to enter a Rift it cannot stand on and no building is
ever planned on one. The policy's own estimates agree with the rule: the
campaign and endgame distance maps and the naval plan's land components
treat a Rift as impassable ground, the Road corridor never routes a Road
over one, the threat estimate lets only a hostile flyer move over or end
on a Rift, and no hostile Kaboom is expected from a Rift tile. Flyers are
not sent to Rifts on purpose; they end there only when an ordinary move
choice does.

## The Redevelop and rebuild cycle (`pulp_wars-9s0.9`)

**Defect.** A seat could `REDEVELOP` a tile and then build the same
improvement back on it, over and over in one turn. In the Martian measurements
a rich seat did this 54 times in one turn, until the 128-command cap. At
`pulp-wars-poc-7r32` the turn cap was no longer reached, but the cycle still
cost Coins: in a 14 x 14 Dry Land Martian mirror (seed 9, round 28) player 1
redeveloped the Lumber Camp at (10, 5) and rebuilt it four times, until its
Coins ran out.

**Cause.** A Redevelop's `futureValue` is the plan's best next placement once
the target is empty, minus the baseline. Like the rest of the public spatial
plan, this ignores technology and Coin gates. At (10, 5) the plan's
replacement was a Windmill worth 43. The seat could not build it because it
had not researched Milling. So the Redevelop scored +43 and passed the
existing check that the replacement differs from the current improvement.
Once the tile was empty, the only legal improvement there was the old Lumber
Camp. The economic tier ranks a build by its immediate Population and income
(priority 1200 here) whatever its `futureValue` (-43), so the policy rebuilt
the camp. The board was then the same as before, three Coins poorer, and the
Redevelop scored +43 again.

**Fix.** Two candidate rules in `isPolicyCandidate` (`src/ai/v7.ts`) read the
same public query, `queryPublicPlannedImprovementV7(view, at, mode)`
(`src/engine/v7/query.ts`). The query uses the same gate-ignoring placement
enumeration and placement score as the spatial plan, and returns the plan's
best improvement for one target. With `CURRENT` it reads the board as it is;
with `AFTER_REDEVELOP` it first removes the target's improvement.

1. **Root cause.** A Redevelop is a candidate only when its planned
   replacement (`AFTER_REDEVELOP`) can be built now: the technology is
   researched and the seat has the Coins for it. Redevelop itself is free. A
   Monument is planned only with an unspent entitlement and costs nothing.
2. **Undo/redo guard.** A building command (a Farm, Lumber Camp, Mine,
   processor, Market, or Monument) is not a candidate when two things hold:
   its `futureValue` is negative, and the plan reserves the target
   (`CURRENT`) for a different improvement whose technology the seat already
   has. After a Redevelop the policy took, the target is reserved for its
   replacement, so the policy never rebuilds what it just removed. It builds
   the replacement, or leaves the target empty until it can.

The policy remains a pure function of the public view. It keeps no record of
the turn's commands, so cold and incremental decisions still match and a
resumed turn decides the same way. For that reason the guard is a rule on the
plan and the target rather than a log of the turn. One case remains: another
build in the same turn could change the plan so that the target's
reservation becomes the removed improvement again, for example by taking the
replacement's one-per-city slot. The policy may then rebuild the removed
improvement once. It cannot repeat this, because the Redevelop no longer has
a different replacement.

**Measurements.** These games ran on Dry Land, Normal against Normal, Rival
mode, at `pulp-wars-poc-7r32`. The runs used a scratch harness that loads this
policy and the `4ac6069` policy over the same engine and gives each seat its
own policy. A "cycle" is a Redevelop followed, in the same turn, by a build on
that tile that restores the removed improvement.

| Run                                                             | Games | Policy before           | This policy |
| --------------------------------------------------------------- | ----: | ----------------------- | ----------- |
| Head to head, ORIGINAL, MARTIAN, DWARF, GOBLIN mirrors, 14 x 14 |    64 | 31 wins                 | 31 wins     |
| Head to head, the same mirrors, 11 x 11                         |    64 | 32 wins                 | 32 wins     |
| Cycles, seven mirrors (every faction), 14 x 14, seeds 0-9       |    70 | 29 in 13 turns (12/140) | 0           |
| Cycles, Martian mirror, 14 x 14, seeds 0-39                     |    40 | 18 in 8 turns (6/80)    | 0           |

The head-to-head games used seeds 0-7, with every seed played in both seat
orders. Of the 128 games, 126 were decided, 63 for each policy. This is no
regression for a bug fix: the result follows the seat order, as it does
between identical policies. The base seats of those games also cycled 17
times, and the new seats never did. In the cycle runs, both seats in a game
used the same policy; the counts in brackets are the seat-games with at least
one cycle. With the fix, Redevelops fell from 68 to 22 in the seven-mirror
run. No run reached the 128-command turn cap under either policy. The
longest turn was 81 commands.

The regression tests are in `tests/unit/ruleset-v7-normal-policy.test.ts`.
One is a synthetic two-Lumber-Camp fixture where the planned Market lacks
Administration. The other is the recorded seed-9 turn
(`tests/fixtures/ruleset-v7-redevelop-cycle.json`). Both fail with the policy
before the fix.

## Mission directives (`pulp_wars-68k.3`)

A mission's AI seat may carry one directive
([campaign design](../product/CAMPAIGN.md) section 2.5): `NORMAL`, `RUSH`,
`HOLD(zone)`, or `GUARD(zone, garrison)`, each optionally `untilRound`.
`src/ai/v7-directives.ts` resolves it from the public view
(`view.setup.mission` names the mission, `view.viewer.seat` the seat) and
plays it while `view.round < untilRound`; from that round on, and for seat 0,
a seat without a directive, `NORMAL`, and every non-mission match, the
directive plan is null. A zone is a union of inclusive rectangles. Nothing
reads hidden state, the clock, or the PRNG.

The directive enters the policy at exactly two points; scoring, tactics,
faction modules, research, and production are untouched.

1. **The leash** (`leashReadyCommandsV7`), applied to
   `queryAiReadyCommandsV7` output in `NormalPolicyWorkV7.prepareContext`
   (and in `makeContext`, which the inspection helpers use). It removes every
   command that would end a leashed unit's relocation outside the zone: the
   end of a Move path, a Disembark, a Bomb Run landing, a Tunnel (the Mole
   and its rider), a Beam Down passenger. Attacks (an advance after a kill
   included), `END_TURN`, research, training, construction, and every city
   command are never filtered, so a directive cannot leave the policy without
   a legal command. A leashed unit already outside the zone (an advance
   carried it out, or it was trained or started there) keeps the relocations
   that bring it closer: fewer land-route steps to the zone where both tiles
   have an explored route, otherwise a smaller distance. `HOLD` leashes every
   own land or embarked unit, `GUARD` its garrison, `RUSH` nothing.
2. **The plan** (`CampaignFactsV7.directive` in `src/ai/v7-campaign.ts`).
   - `RUSH`, once a hostile city is known: no village, chest, or exploration
     job, and no defence job for a free unit (only the reserve, the
     defenders walking to a threatened city, still defends); every free unit
     with a land route marches on its nearest known hostile city, and every
     wave sets out at once (`needed` 1, `push`). With no hostile city known
     the plan is the `NORMAL` plan. A unit with no explored land route to the
     city has no job and approaches it directly, as before the campaign plan.
   - `HOLD`: no `VILLAGE`, `CHEST`, `EXPLORE`, or `ATTACK` job whose target
     lies outside the zone (the frontier, the villages, the chests, and the
     march targets are filtered; `atWar` still reads every known hostile
     city, so war training is unchanged).
   - `HOLD` and `GUARD`: before any other job, a leashed unit outside the
     zone takes the new `RETURN` job to the nearest zone tile (by distance,
     then the straighter line), following the land-route field to the whole
     zone; a `GUARD` garrison unit inside the zone takes `RETURN` to its own
     tile, so it stays (a Move inside the zone makes no route progress). A
     unit on an own city center while a hostile unit is near, or a defender
     with a threatened-city objective, keeps that objective as before.
   - **Garrison** (`guardGarrisonV7`), recomputed at every decision: own land
     units inside the zone first, then by land-route steps to the zone
     (units with no route last), then by unit ID; at most `garrison`, fewer
     when the seat has fewer land units. Every other unit plays `NORMAL`.
   - **Routes to the zone are per unit:** whether a unit's route crosses
     Mountains is the shared terrain rule (`unitMayEnterMountainV7`:
     Engineering, a walker or flyer, or a Mountain-born unit), so at most two
     fields are built per decision. All directive readers read the board
     (`view.units`): a burrowed unit takes no command and stands in no zone,
     and a Tunnel that would surface a leashed Mole or rider outside the zone
     is a removed relocation.

The naval plan is now gated on `forbiddenTechnologiesV7(setup)` containing
Shorecraft, not on `mapType === "DRY_LAND"` (the same set on Dry Land and
none on the generated map types). A mission with water and a forbidden Naval
branch therefore plans no crossing: before this change the plan for
`TEST_GROUNDS` was active from round 1 and held 6 Coins back for a Shorecraft
the seat could never research. `inspectNormalNavalPlanV7` publishes the plan's
public facts.

**Identity.** With a null directive plan the leash returns the ready array
itself and the plan facts carry no `directive`, so every decision is
byte-identical. Measured with a scratch harness over 24 headless matches at
`pulp-wars-poc-7r34` (Dry Land, Pangea, Continents, Archipelago, and Lakes at
11 x 11 with four faction pairings each, a three-seat Cooperative Continents
match, and a four-seat Showcase match): the command, event, and final-state
hashes equal those of `main` before this change. `TEST_GROUNDS` (a `NORMAL`
mission with water and the Naval branch forbidden) changes, and only through
the naval gate: with the old gate restored it replays the old hashes.

**Fixtures and evidence.** The hidden missions `TEST_RUSH` (Goblin, four
units), `TEST_HOLD` (Undead, rows 0–4 until round 8, one unit starting
outside), and `TEST_GUARD` (Undead, the 3 x 3 gate zone, garrison 2)
(`src/engine/v7/missions/test-directives.ts`) are played headless in
`tests/unit/ruleset-v7-mission-directives.test.ts`. Measured with a scratch
harness: each fixture played 11 times, up to 30 rounds (the unvaried game and
proxy seeds 1–10 at rate 0.15), once with its directive and once with every
directive disabled (`NORMAL`); no run had a policy error or a stall.

| Fixture      | With the directive                                                                                                                                                | `NORMAL` on the same board                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `TEST_RUSH`  | first Goblin attack in round 4 in all 11; every job `ATTACK` once a route is explored; the Goblins win 10                                                         | first attack in rounds 5–7; the Goblins win 10                                                                 |
| `TEST_HOLD`  | before round 8 no unit ends an Undead turn outside the zone except the one that starts outside (2 turns, walking back); a unit leaves the zone after round 8 in 7 | units end 7 of 7 turns before round 8 outside the zone (up to 4 tiles); the Undead win all 11, median round 11 |
| `TEST_GUARD` | at 235 of 240 Undead End Turns at least `min(2, land units)` stand in the zone; the 5 misses are one run in which the human army occupied the zone                | 42 of 116 End Turns short                                                                                      |

A garrison that dies is replaced by the next unit in the choice order, which
has to walk in; a replacement cannot enter tiles the enemy holds.

## Siege of a single-file front (`pulp_wars-68k.6`)

On the campaign mission "Bone Neck" (a one-tile isthmus three tiles long
under a fortified gate) the policy never breached
([campaign design](../product/CAMPAIGN.md) section 8.3): it attacks only at
favourable odds, so Guards and Zombies facing each other across a one-tile
front never engaged, and an own Catapult or Guard parked on the isthmus
corked the only path for the rest of the army. The policy now besieges such
a position (`src/ai/v7-chokepoint.ts` and the `chokepoint` helpers of
`src/ai/v7.ts`), for every faction and in every match. It reads only public
facts (explored tiles and their territory owner, cities on explored tiles,
visible units, the viewer's Coins) and adds no PRNG use, elapsed-time input,
or work units.

**The front.** A chokepoint front exists for a viewer when

- every explored land route from every own city center to its nearest known
  hostile city (by land-route steps, then city ID) passes through the same
  run of at least two consecutive tiles, each of which alone separates the
  cities (the **corridor**; the land is the campaign plan's, units are not
  walls);
- the corridor's far end is at least two tiles from that city's center (a
  corridor that opens onto the center itself is a city assault, which the
  ordinary policy plays); and
- a fortified position holds it: visible hostile land units stand on the
  corridor or within three tiles of its far end on the target's side (the
  **garrison**), and at least one of them stands in its owner's territory.

The corridor is ordered from the home side. Its **head** is the last
corridor tile with no hostile unit on it or behind it. The **holders** are
the garrison units on the corridor or next to its far end (the **mouth**);
with no holder left the mouth is **open**. The **apron** is the home-side
land next to the entrance, the **yard** the home-side land within two tiles
of it, and the **lane's tail** the apron tile nearest the own cities
(straight behind the entrance before a diagonal one). With several such
corridors on the way, the one nearest the target that is held is the front.
The plan is null without a front, every rule below is gated on it, and so a
position without one keeps its decision exactly.

**Unit classes.** A melee unit with Defense 2 or more is durable (`HEAD`),
any other melee unit `MELEE`, a unit that hits from distance 2 or more
`RANGED` (a Catapult, a Marksman), and a support unit (a Captain) or a unit
that does not attack `OTHER`. A unit is fit at half its HP or more.

**The lane.** These refuse a Move (it is no candidate):

- A support unit stays off the corridor until the column is through the
  open mouth.
- A siege unit takes a corridor tile only behind a screen: an own melee
  unit ahead of it on the corridor, or the column beyond the mouth. Nothing
  has to pass it there, so it does not block the lane. It never takes the
  lane's tail.
- A melee unit below half its HP does not enter or advance while the mouth
  is held.
- A melee unit takes a tile with no own melee unit ahead of it (it holds or
  takes the head) at any time. It follows the column only when the lane is
  not needed by the siege (the mouth is open, or no own siege unit stands
  on the corridor or within four steps of the entrance) and the unit ahead
  is not a wounded head on its way out. With the siege on, one melee unit
  holds the head and the lane behind it is the siege units'.
- The apron (when it has more than one tile): the lane's tail is for melee
  units only, and with the siege on and the mouth held melee units stay off
  the other apron tiles, which are the siege units' way in and firing
  tiles. Then also at most three melee units form up in the yard; the rest
  of the army waits behind, so that a siege unit and a unit leaving the
  corridor can move.
- No other unit ends a Move on the firing tile a siege unit walks to.

**Lane moves**, priority 1105 (above routine moves at 700–850, below the
fire) unless stated:

- **Rotation.** A wounded head (below half its HP, no fit melee unit ahead)
  withdraws toward home at 945, just above an urgent Recover (930), while
  the mouth is held. In single file it can only do so while the tile behind
  it is free: a column behind it holds it in place, and its relief does not
  step into its way out.
- A siege unit with no melee unit ahead of it leaves the corridor once a
  fit durable unit is staged behind it (until then it fires); a support
  unit leaves it. A unit on an apron tile the lane rule does not give it
  makes room. At 945 so do a unit on the apron when the unit on the
  entrance has to leave and every apron tile is taken (the weakest goes),
  and a melee unit on the firing tile a siege unit walks to.
- **Firing tiles.** A siege unit walks to the tile within four tiles of it
  that the lane rule gives it, outside visible lethal reach, with the most
  targets in range (the holders, or the garrison through an open mouth), a
  tile off the corridor before a corridor tile, then the nearest. The walk
  goes round the lane's tail. A tile with two more targets in range than
  its own is taken before this turn's shot (1113).
- **The column.** A melee unit steps onto the corridor, along it, and from
  its far end into the mouth, the strongest first (HP times the sum of
  Attack and Defense): outside visible lethal reach while the mouth is
  held, at once through the open mouth (wounded units too) or once the
  attrition clock has struck.

**Fire and commitment.**

- **Focus.** Among the holders an own unit can attack this turn, the focus
  is the one the unanswered own attacks on offer leave with the least HP
  (then the least HP, then the lowest ID). A unit that has the focus on
  offer does not attack another holder, except to kill it. An unanswered
  attack on the focus takes priority 1112, so the shots come first.
- **Commitment.** A melee attack on the focus that the policy refuses as
  harmful is made (priority 1108) when the attacker survives, no unanswered
  own attack on the target is still on offer, and either the target has at
  most half its HP (the siege fire has done its work) or the attrition
  clock has struck and this turn's surviving attackers together out-damage
  the target's idle recovery.
- **The attrition clock.** The policy has no memory, so it cannot count the
  turns of a stalemate. It reads the treasury instead: a seat that still
  has something to buy spends its Coins every turn, and a seat stuck at a
  front fills its unit capacity and its Coins pile up. With 30 unspent
  Coins the siege turns into an assault: the head advances into lethal
  reach, siege units take firing tiles in lethal reach, and the commitment
  above applies. The Coins replace what the assault loses.

**Production.** At a front the seat's savings goal
([second pass](#second-pass-savings-hunts-and-sieges-pulp_wars-9s08)) is
its siege unit (`CATAPULT` role), or the technology one step away, while it
has fewer than three siege units and the match does not forbid that
technology; siege roles get +24 in the city's production choice while the
seat is short of them, and every melee role +3 per half-unit of Attack (a
breach needs units that hit: Guards do 2 damage to a fortified Zombie and
take 9).

**Switch.** `setChokepointPolicyOptionsV7({ siege, offSeats })` (tests and
headless harnesses only) turns the siege off for every seat or for the
listed seats: the policy before this change, for the head-to-head.

**Tests.** `tests/unit/ruleset-v7-chokepoint-ai.test.ts` plays the hidden
fixture mission `TEST_NECK` (`src/engine/v7/missions/test-neck.ts`: two
shores joined by a neck two tiles long, the mouth fortified and in the
Undead capital's territory): the detection (the corridor, the head, the
holders, the open mouth, no front for a skirmish on the neck, on an open
board, or with the switch off, and the isthmus of Bone Neck), the lane (a
siege unit out of the corridor until screened and off the tail, the lane
and the apron kept for the siege units, the strongest unit first), the
rotation, the focus, the commitment, an open-board match decided exactly as
without the siege, and a match on the neck without a policy error or stall.

### Siege measurements

Scratch harnesses, not checked in; every match is deterministic.

**Ordinary boards decide exactly as before.** 31 headless matches at
`pulp-wars-poc-7r37` (before the Candy revision; the mission playtest was rerun at `7r38` with the same results), each played with the siege on and with the switch off
(up to 60 rounds): Dry Land, Pangea, Continents, Lakes, and Archipelago at
11 x 11 with five faction pairings each (Human/Undead, Goblin/Dinosaur,
Martian/Ice Folk, Dwarf/Human, Undead/Goblin; seeds 1–5), a three-seat
14 x 14 match per map type (Human, Goblin, Undead; seed 7), and a
Cooperative three-seat Continents match (Human, Martian, Dwarf; seed 9).
All 31 have equal command, event, and final-state hashes, and a replay of
each match found a front at none of its decisions. So a head-to-head of the
new policy against the old one on these boards is the old policy against
itself: the 24 head-to-head matches on Lakes and Archipelago (each board
with the siege on for one seat only, both ways) are the old matches, move
for move. The campaign missions 1–3 have no front either: their 30
playtest runs (10 proxy seeds each) end in the same final-state hash with
the siege on and off.

Two earlier definitions of the front did change ordinary boards and were
dropped. Without the "garrison in its own territory" and "not onto the
target center" conditions, three of the same 31 matches had a front (at 25,
31, and 306 decisions) and differed; in one (Lakes, Dwarf against Human,
seed 4) a mid-map skirmish on a mountain pass that opens onto the Dwarf
capital counted as a front for five rounds, the Human army formed up
instead of storming the capital, and the seat that had won in round 39 had
not won by round 80. With the two conditions that match is identical again.

**Bone Neck.** [Campaign design section 8.5](../product/CAMPAIGN.md#85-68k6-normal-ai-siege-of-a-single-file-front)
has the playtest of mission 4 before and after and the mission's revision 2.
In short: on the design's numbers the siege alone does not breach (0 of 20:
a Lich behind the gate shoots first at every siege tile); on revision 2
(no Lich, two starting siege units) the Human proxy wins 3 of 10 runs with
the siege and none without it, and the Goblin proxy 4 of 10 with it and 5
of 10 without it (the Goblin swarm does not need the siege; the difference
is within the noise of ten runs).

## Map curiosities (`pulp_wars-737.4`)

The policy knows the [map curiosities](../product/RULESET_7_MAP_CURIOSITIES.md)
(section 11 of that spec): the Giant Spider, the Fountain of Youth, the
Shrine, and the Sunken Wreck. `src/ai/v7-curiosities.ts` holds the facts,
the errand planner, and the constants; `src/ai/v7.ts` calls it at the points
listed below. Every input is public: the view's `curiosities` and `monsters`,
`previewMonsterV7`, the `monsterRetaliates` field of the combat preview, the
visible units, and the explored tiles. Nothing reads the Spider's wander
draw, the PRNG, or the clock. The rules are the same in Rival and
Cooperative matches (the Spider is hostile to every seat).

**The gate.** `curiosityFactsV7(view)` is null when the view has no explored
curiosity and no visible Monster, and every rule below runs only when it is
not null. A match without a curiosity therefore keeps its decisions and
hashes; so does a match with one, until a seat first sees it. The module has
a switch (`setCuriosityPolicyOptionsV7({ curiosityPlay: false })`, tests and
headless harnesses only) that makes the facts null always, which is the
policy of `pulp-wars-poc-7r36`; the head-to-head below uses it. No ruleset
identity changed.

**The Spider.**

- **Routine Moves.** A `MOVE` or a `DISEMBARK` that ends on a visible
  Spider's `provokeTiles` (the tiles next to it) is no candidate. The one
  exception is a melee hunter's Move in a combined kill (below).
- **Stepping away.** A unit the Spider would count among its targets (it
  stands on a provoke tile, or it is in the Spider's `provokedBy` and inside
  its `reachTiles`), which is no hunter and has no offered attack on another
  unit, gets `MONSTER_STEP_AWAY_PRIORITY_V7` (1176) for a Move to a tile
  where the Spider would not count it.
- **Attacks.** An `ATTACK` on a Spider is a candidate only when (a) it kills
  the Spider or the unit is a hunter in this turn's combined kill, or (b) the
  preview says `monsterRetaliates` is false (the attacker stays outside its
  reach), the attacker survives, the hit is more than
  `MONSTER_REGENERATION_V7` (4), and the unit has no offered attack on
  another unit. A kill adds the bounty (`MONSTER_BOUNTY_V7`, 10) to the
  ordinary kill value.
- **The combined kill** reuses the hunt plan of the second pass
  (`huntPlansV7`): every visible Spider is a hunt target, so a plan exists
  only when the own units that can strike it this turn (from where they
  stand, or after a Move) project its whole HP between them. The hunters'
  Moves and attacks take the hunt priorities (1177, 1178, 1182). Three
  rules are stricter than for other hunts, because a failed kill leaves
  units next to the Spider:
  - each hunter that moves in may end only on the one tile the plan counted
    for it (a ranged hunter's is never next to the Spider), so no hunter
    takes the tile another needs;
  - a hunter whose retaliation damage would kill it takes no part (judged
    against the Spider as it stands, which is cautious for a late hitter);
  - a sole city defender is never a hunter that moves.
- **Threat.** `visibleImmediateDamage` counts a visible Spider for a unit on
  its provoke tiles, or in its `provokedBy` inside its reach, with the
  ordinary projected damage, and leaves it out of the Move-and-attack reach
  estimate (standing in its reach unprovoked is safe). Its entry in the
  threatened-tiles map is its provoke tiles, and it never threatens a city.
- The policy never lures the Spider or feeds an enemy to it. Splash, Wail,
  Kaboom, Bomb Run, and Eruption candidates are not filtered: a hit on the
  Spider by one of these is incidental, as for any unit in the blast.

**Errands** (`planCuriosityErrandsV7`). Each curiosity gets at most one own
unit and each unit at most one errand, Fountains first, then Shrines, then
Wrecks, the nearest unit by route steps over explored tiles (ties to the
lower unit ID):

- **Fountain.** A hurt own land unit standing on a Fountain that no visible
  enemy can strike keeps it: its Moves are no candidates until it has full
  HP. Otherwise, when no other owner's unit stands on it and no visible
  enemy can strike a unit there, the nearest own land unit at half HP or
  less that is no construct and no sole city defender, within two turns of
  its Move, walks to it: `FOUNTAIN_ARRIVE_PRIORITY_V7` (946) for the Move
  onto it and `FOUNTAIN_APPROACH_PRIORITY_V7` (944) for a Move that comes
  closer, both above `RECOVER` (930) and the wounded Windmill staging (940).
  These Moves are scored after the campaign's hold, so a wave that waits at
  home does not keep a wounded unit from the Fountain.
- **Shrine.** The nearest own unit that could be Promoted there (land form,
  no veteran, not a growing dinosaur) within 4 route steps, no sole city
  defender and with no capture to make (a capturer within 2 of a center it
  can take): `CURIOSITY_CLAIM_PRIORITY_V7` (1330, the treasure-chest
  priority) for the Move that ends on it and
  `CURIOSITY_APPROACH_PRIORITY_V7` (725) for a Move that comes closer.
- **Wreck.** The nearest own unit afloat (a boat or an embarked unit) within
  4 water steps, or a Patrol Boat within 8 while the naval plan sees no
  hostile ship: the same two priorities.

A **sole city defender** is an own land unit on the center of one of its
owner's cities with no other land unit of that owner within 2 of the
center. It takes no errand and is never a moving hunter.

### Curiosity measurements

A small check, as the user asked (no balance testing): scratch harnesses at
`pulp-wars-poc-7r36`, Normal against Normal, Rival mode, two seats, 16 x 16.
"Old" is the policy before this bead (the switch off), "new" is this policy.

**Unchanged without a curiosity.** 64 headless matches to 30 rounds (seeds
0–7; Dry Land, Pangea, Lakes, Continents; four faction pairs; every fourth
seed Cooperative), each played by the code before this bead and by this
policy. All 32 with `curiosities: false` have the same final state hash. Of
the 32 with the option on (every one of those boards drew a curiosity), 21
have the same hash (no seat acted on the curiosity) and 11 differ. With the
switch off, all 64 match the old code, so the switch is the old policy.
A four-seat 16 x 16 Pangea board that draws no curiosity with the option on
is pinned in `tests/unit/ruleset-v7-curiosities-ai.test.ts` (same hash and
command hash with the switch on and off). No error or stall in any run.

**Head-to-head.** 13 boards that drew a curiosity (the first 7 with a
Spider on Pangea and Lakes, and the first 2 each with a Fountain, a Shrine,
and a Wreck; seven faction pairs), each played in both seat orders to 60
rounds: 26 games.

|                          | New policy | Old policy |
| ------------------------ | ---------: | ---------: |
| Games won (1 undecided)  |         14 |         11 |
| Units lost to the Spider |          0 |          6 |
| Spiders slain            |          4 |          2 |
| Shrines claimed          |          1 |          1 |
| Wrecks salvaged          |          0 |          0 |
| Fountain heals           |          0 |          0 |

Seat 0 won 18 of the 25 decided games: on 11 of the 13 boards the same seat
won in both orders, so the win count says little beyond "not worse". The
new policy won both orders on one board (a Shrine board), and on one Spider
board it won as seat 0 while the old policy as seat 0 was still short of a
win at round 60.

**Both seats the same policy,** the 7 Spider boards: the old policy lost 6
units to the Spider and slew it on 2 boards; the new policy lost none and
slew it on 3.

**What the sample does not show.** No Wreck was salvaged and no unit healed
on a Fountain by either policy, and the one Shrine claim per side was a
routine Move for the old policy. These two-seat games are short (8 to 49
rounds when decided) and the errands are deliberately narrow (4 route
steps; half HP within two turns), so the Fountain, Shrine, and Wreck rules
are covered by the unit tests rather than by these games. The coarse check
of `pulp_wars-737.7` is the place to measure them on larger boards.

A first draft lost 3 units to the Spider in one game: a hunter moved onto
the only tile another hunter could reach, the kill fell short, and the
units stayed next to the Spider; and 5-HP units joined kills they could not
survive. The per-hunter tile and the retaliation rule above fixed both.

## Revision-8 merged industry and processor adjacency

The current Ruleset 7 policy uses the single
`PROSPECTING -> ENGINEERING -> METALLURGY` Industry & Warfare chain.
Prospecting valuation includes Ore, Mountain access, Guard, Spoils, and city
fortification; Engineering includes Mine/Workshop development, field defense,
Redevelop, and capacity; Metallurgy includes Forge, Heavy, Breacher, and
Pillage. Removed Drill, Fortification, and Explosives IDs are never proposed.

Windmill, Sawmill, and Forge placement and development scores use only the
eight immediately adjacent matching contributors owned by the same player.
Contributors assigned to another owned city count and may support several
processors; connected distant improvements and foreign contributors do not.
The score consumes the exact public multi-city preview, so a basic improvement
is valued for every affected processor city without inferring fogged tiles.

## Revision-6 naval planning

Ruleset 7 Normal builds naval objectives only from `PlayerViewV7`, public
commands, and public previews. `NormalPolicyWorkV7` yields during land-component
and water-route passes, so a cold 25 x 25 view remains inside the browser work
loop. The plan reserves the next required technology, Port, fleet capacity, and
Coins; chooses Ports and movement by public shortest-route distance; and keeps
the established land tuple unchanged when no naval objective exists.

An overseas objective or a shorter public sea route can activate Shorecraft,
Port construction, embarkation, exploration, landing, and the ordinary capture
wait. Known Deep Water adds Navigation. Visible afloat danger holds departure
for a Patrol Boat escort, while a defended coast can add Naval Engineering and
Battleship bombardment. Landed capture units continue a known objective on
their new landmass before embarking again. Cooperative planning excludes allied
land, water, and Ports. Revision 16 (`pulp_wars-zsa`): embarked reach uses
Move 2 (the shared `EMBARKED_MOVE_V7`), and `DISEMBARK` is a candidate only
when the public query offers it, which requires at most one point spent. An
embarked Move that makes route progress, spends one cell, and ends next to a
planned landing cell gains one objective point, so a transport one cell from
the landing coast moves one cell and lands the same turn instead of taking a
two-cell Move along the same coast.

The authoritative
[Ruleset-7 revision-4 biome-economy specification](../product/RULESET_7_REVISION_4_BIOME_ECONOMY.md)
supersedes revision-3 Normal-AI economy valuation, Ore visibility, Mine/Forge
planning, and related validation before revision-4 implementation. The
revision-2 material below remains historical; unchanged policy rules continue
to derive from the main Ruleset-7 contract.

## Ruleset-7 revision-2 policy (historical implementation)

This section documents the historical revision-2 implementation and evidence.
It is not the revision-3 policy contract. The authoritative revision-3 Horse
Archer, reduced economy, command, and telemetry requirements are in
[Ruleset 7](../product/RULESET_7.md#10-normal-ai-scheduling-headless-and-telemetry)
and supersede conflicting revision-2 details here for subsequent implementation.

Ruleset 7 Normal is a deterministic, PRNG-free policy over `PlayerViewV7`,
`queryAiReadyCommandsV7`, and public query/preview results. It does not import
the reducer, `GameStateV7`, map generation, authoritative combat estimates, or
private opponent research and economy. Browser and headless scheduling use the
same selector. Two equal public views therefore produce byte-identical
candidates, signed scores, and commands even when their concealed authority
states differ.

Every decision rebuilds the public candidates and compares this tuple
lexicographically, larger first:

```text
priority, strategicValue, immediateValue, futureValue, safetyValue,
objectiveValue, -commandKindOrdinal, -targetY, -targetX,
-primaryEntityId, -contentOrdinal
```

The final fields use the Ruleset-7 frozen command, technology, role, reward,
coordinate, and entity orders. `WAIT` is not a policy candidate. Mandatory
reward choices take precedence; when no modal or Pursuit sequence is open,
`END_TURN` is the zero-priority fallback.

Research scores the marginal first step and total cost of a shortest public
chain to a currently visible economic action or missing trainable role. Spatial
plans use exact public previews, including recurring output, outages and
resumptions, restored-site rebuild costs, Barracks capacity, Fortification,
Road/Market connection, and Monument opportunity cost. An ordinary income
floor is valued as one Coin only when the public city is neither besieged nor
in active Blackout. Treasury is worth its actual 12 Coins; Juggernaut is a
40-HP one-slot unit with public Push and placement consequences, not a
fictitious purchase price. Prospecting Spoils is valued on the first hostile capture
of each specific city.

Combat uses only published roles, stats, positions, activation and previews.
There are no role-ID matchup bonuses. Visible Lancer threat includes its
public move/Charge corridor and Pursuit reach, with durable public screens
priced separately. An open Pursuit is a global sequence lock: Normal searches
the complete remaining public tree through at most three total attacks,
including Pursue and End leaves. Whole branches compare strategic value,
immediate combat value, resulting safety, and hostile spacing in that order.
Projected Pursue preserves its special activation semantics and never invents
ordinary movement Charge. Concealed-contact paths use conservative public leaf
values. `END_PURSUIT` wins when no complete branch improves on ending at the
current position. The incremental search yields between nodes; elapsed time
never enters the score.

Defection values the visible target, reserved home-city capacity, source
survival, public escape/kill/rescue replies, duration, and visible siege
consequence. Candidate home cities are ordered by free capacity, visible
safety, then city ID. A reply attack counts only when its public origin, role
range, minimum range, and move-then-primary rule make it legal; a Guard cannot
move then attack, an adjacent Catapult cannot fire, and the marked unit may
move through its own territory but not another allied player's territory.
Unknown roads, blockers, or research never manufacture a guaranteed reply.

Blackout value uses attributable public city income and source exposure risk.
The policy does not infer private Coins, research, or hypothetical purchases.
Catapult coordination sums actual public damage from every currently legal
range-2/3 shot, setup state, public healing/recovery between volleys, screens,
and siege geometry; an adjacent enemy blocks only that Catapult's invalid shot,
not another unit's legal ranged shot.

The per-turn cap is 128 accepted commands. Before choosing productive work,
the scheduler reserves enough slots for every authoritative pending reward,
every defensively observed open Lancer, and End Turn. Execution resolves the
first serialized open Pursuit, matching the reducer's global lock. Rejection,
missing public work, non-advancing acceptance, or inability to drain mandatory
work is a structured failure; Normal never retries using hidden authority.

`NormalPolicyWorkV7` persists command preparation, public economic/spatial
planning, visible-hostile context, and candidate scoring for one exact view.
Command and planning preparation each advance with an operation budget of one;
ready tuples are created after command preparation. Public naval, threat, and
tactical context identifies the unconditional Road/Redevelop exclusions above;
the remaining public plan is then drained before any synchronous potential or
spatial-score consumer can read its exact caches.
A globally Pursuit-locked command set skips economy planning because its public
commands are exclusively Attack, Pursue, and End Pursuit and no candidate path
consumes an economic potential or spatial score. The complete three-attack tree
still yields between nodes. Synchronous selection drains this same work object,
so time slicing changes only pause boundaries.

Run the checked retained command-1100 policy benchmark with:

```bash
npx tsx scripts/benchmark-ruleset-v7-normal-policy.ts
```

It complements the separate public-planning benchmark's independently frozen
public-query hashes with a new same-core sync/chunk policy regression. This
command checks the retained view and policy decision hashes, not every engine
hash itself. The new policy decision hash was recorded after scheduler
integration, so it is not represented as a pre-refactor golden. The expected
decision is `RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION` in
`scripts/ruleset-v7-late-public-view-contract.ts`, the pin that
`tests/unit/ruleset-v7-normal-policy.test.ts` keeps current under
`npm run check`. Until `pulp_wars-c87.8` the script carried its own copy
(`BUILD_FORGE` at (9, 8)), which no gate ran: it had been stale since
521c3da (revision 4, 2026-09-12), when the decision became the Attack of
unit 19 on unit 34, and the script threw on every later tree. On the
development machine, observed constructor time was 0.9–1.5 ms, total sliced preparation/scoring was
1.16–1.20 seconds, the largest 8 ms host slice was 12.6–13.5 ms, and no measured
slice exceeded 16 ms. These are load-sensitive diagnostics, not portable timing
guarantees; browser integration must measure its own host responsiveness.

A Capture receives match-ending priority only when the public reducer outcome
would end: capturing the human's last city is immediate Defeat, while removing
the last nonhuman rival is Victory only when the human is the sole remaining
active player. Eliminating one rival while another remains uses ordinary
hostile-city priority.

## Frozen Ruleset-6 policy

Normal is deterministic, renderer-independent, observation-safe, and
PRNG-free. It receives only `PlayerViewV6`, `queryPlayerCommands(view)`, and
public economic/combat previews. Policy code may not import `GameState`, map
generation, reducer legality, hidden resources/entities, or authoritative
preview functions.

## 1. Candidate construction and tie-breaks

Rebuild the complete candidate list after every accepted command. Remove Wait;
classify every other public command exactly once. A pending reward or Candify
choice is normally the only public resolver. End Turn is always present when no
choice blocks it and always has priority zero.

Compare this signed-integer tuple lexicographically, larger first:

```text
priority, strategicValue, immediateValue, futureValue, safetyValue,
objectiveValue, -commandKindOrdinal, -targetY, -targetX,
-primaryEntityId, -contentOrdinal
```

The last five fields use the frozen Ruleset-6 orders. A missing coordinate is
`(-1,-1)` before negation. `primaryEntityId` is acting unit, then target unit or
wall, then city, then zero. `contentOrdinal` is technology, role, reward,
improvement, direction, or zero. No query iteration order survives this tuple.

## 2. Exact priorities

| Priority | Candidate                                                             |
| -------: | --------------------------------------------------------------------- |
|     1400 | Capture that visibly ends the match                                   |
|     1360 | Other hostile-city Capture                                            |
|     1340 | Neutral-village Capture                                               |
|     1330 | Move directly onto a globally public treasure chest                   |
|     1320 | Promote                                                               |
|     1300 | Mandatory city/Candify choice                                         |
|     1280 | Guaranteed kill of a unit threatening an owned city                   |
|     1270 | Medic heal of a damaged defender in a threatened city                 |
|     1260 | Train in a threatened city                                            |
|     1250 | Move a friendly unit onto an empty threatened city                    |
|     1240 | Other Attack against a threatening unit                               |
|     1230 | Safe Roll that destroys a visible hostile threatening a city          |
|     1210 | Economic action whose public delta reaches one or more city levels    |
|     1200 | Build/connection that adds at least one recurring Coin per turn       |
|     1180 | Other guaranteed kill                                                 |
|     1160 | Research first step on shortest chain to a visible economic action    |
|     1140 | Economic action with positive population or permanent Coin value      |
|     1120 | Build Road that connects an existing Market to the capital            |
|     1100 | Build/retain a positive future spatial setup action                   |
|     1080 | General training                                                      |
|     1060 | Research first step to a missing trainable role with a potential slot |
|     1040 | Other legal research                                                  |
|     1020 | Candify hostile territory inside a city footprint                     |
|     1000 | Candify neutral territory inside a city footprint                     |
|      900 | Other non-lethal Attack                                               |
|      880 | Safe positive-damage Roll                                             |
|      860 | Useful Chocolate Wall near a threatened city                          |
|      700 | Move reducing distance to a known objective                           |
|      650 | Move creating a next-command Candify frontier                         |
|      600 | Move maximizing public frontier reveal                                |
|      500 | Medic heal of any damaged friendly unit                               |
|      400 | Recover below half maximum HP                                         |
|      300 | Other Recover                                                         |
|        0 | End Turn                                                              |

Redevelop is eligible only when its public two-ply replacement plan has positive
`futureValue`; Normal never destroys a building merely to spend Coins later.
Clear Forest is an economic action with permanent Coin value 1 but loses the
public future Lumber/Sawmill potential described below. Replant and an
unconnected Road require positive future value. A zero-delta build is not
productive and cannot beat End Turn unless it enables an exact next action.
Clear Forest is excluded when `futureValue < 0` unless its one Coin makes a
currently public candidate of priority 1160 or greater affordable immediately;
this is the exact cash-now versus timber-later policy boundary.

## 3. Shared score components

Threat uses only visible hostile roles and public Move/Range:
`distance <= move + range`. Severity is 3 for siege, 2 when already in attack
range, and 1 otherwise. Equal cities prefer greater severity, capital, lower
visible defender HP (empty is one more than the greatest role max HP), then
city `(y,x)` and ID.

For every candidate:

```text
immediateValue =
  20 * hostileUnitsKilled
  - 16 * ownOrAlliedUnitsKilled
  + 10 * hostileHpLost
  - 8 * ownOrAlliedHpLost
  + 30 * citiesAcquired
  + 20 * cityLevelsReached
  + 5 * populationDelta
  + 12 * recurringCoinDelta
  + immediateCoinsDelta
```

All terms use public previews. Unknown/hidden values are zero. Wall HP uses two
points per hostile HP and minus eight per own/allied HP; walls never count as
units or kills. `populationDelta` is the sum of public city deltas after live
recomputation and may be negative. `immediateCoinsDelta` includes costs as
negative, Stockpile/Treasury/Clear Forest as positive, and excludes future
income.

`safetyValue` is negative projected public damage from every visible hostile
that could attack the acting unit's result tile without moving. Breach, Charge,
and known Push use the public combat estimator. Hidden terrain/units and
`UNKNOWN_RESOURCE` contribute zero.

Known objectives are globally public treasure chests, visible neutral villages,
and hostile cities. Objective
value is negative Chebyshev distance from the resulting tile; equal objectives
use `(y,x)`. With none, frontier value is the number of new non-allied-blocked
coordinates in the public reveal result, then displacement from start. A
zero-gain move may reduce distance to the nearest public unexplored coordinate.

A direct chest Move uses `strategicValue = 1` and `immediateValue = 5`; this is
the fixed expected utility used for ordering, not a prediction or PRNG draw.
Pathing sees only the public coordinate, and reward resolution remains wholly
inside the authoritative reducer.

## 4. Spatial planning score

`futureValue` is calculated by the pure `scorePublicSpatialPlan(view,
candidate)` helper. It applies only the candidate's public, deterministic tile
changes, then enumerates every exact next economic command that would be public
if Coins and technology gates were ignored but terrain/resource ownership and
placement facts stayed unchanged. It never invents an unrevealed resource.

Score each possible next placement:

```text
8 * previewPopulationDelta
+ 18 * previewRecurringCoinDelta
+ 2 * contributingTileCount
+ 3 * distinctTypeOrFamilyCount
+ 4 * oppositePairCount
+ 6 if it creates a legal three-processor Grand Works site
+ 4 if it completes a capital-connected Market road
```

`futureValue` is `bestAfter - bestBefore`, where each best value is the sum of
the greatest non-overlapping next placement for each owned city, cities in ID
order and ties by command order. “Non-overlapping” means no two selected
previews use the same target; contributors may overlap where the rules permit.
This one-step reservation makes Normal preserve a strong Forge/Stoneworks/
Grand Works target instead of filling it with a weak basic building. It does
not search arbitrary build sequences.

For a cluster basic, `contributingTileCount` includes the resulting connected
Farm/Lumber component. For Clear Forest, after-state removes that camp/Sawmill
potential. For Replant, after-state adds one public empty Forest opportunity.
For Redevelop, compare the best exact next replacement at the removed target;
the command is excluded unless `futureValue > 0`.

## 5. Research, growth, and Roads

For each visible owned resource/action, economic placement, or missing role,
walk the owning faction's registered 25-node graph. A shortest chain counts
unresearched nodes including the candidate. Ties use that registration's frozen
node order. A missing Candy registration or role mapping is a structured policy
error, never an Original fallback.

Economic research strategic value is the number of currently public targets
unlocked by the chain plus the greatest public spatial score enabled at its
end. Role research requires an owned non-besieged city with `count < level + 1`;
it need not currently have Coins or an empty center. Other research remains
eligible so Normal can complete all branches.

An economic action “reaches a level” when the preview reports at least one
`CITY_LEVELED_UP`; this includes cross-city live changes. Normal resolves the
resulting ordered reward queue before any other action. For level-2, prefer
Stockpile when Coins < 4, otherwise Survey. For level-3, choose Militia when
known threatened and placement exists, otherwise Walls. For level-4, choose
Expand when at least four neutral cells are claimable or the unexpanded city's
best public spatial score is positive outside 3 x 3; otherwise Boom. At level
5+, choose Juggernaut when placement exists and the player has fewer
Juggernauts than cities, otherwise Treasury. Exact ties take reward ordinal.

Road planning uses only owned explored tiles. A Road gets priority 1120 only
when its accepted placement makes an existing Market capital-connected in the
public preview. Otherwise it needs positive future value. Equal Road plans
prefer fewer remaining orthogonal missing links to the nearest capital, then
the stable tuple. Normal never builds an unbounded decorative road network.

## 6. Production and role behavior

Threatened-city role order is Guard, Fighter, Medic, Heavy, Marksman, Scout,
Raider, Breacher. General order is Scout, Raider, Marksman, Guard, Medic,
Heavy, Breacher, Fighter. Choose the first missing unlocked affordable role;
otherwise the least represented available role, ties by that list. Juggernaut
is never trainable. Count mechanical roles, so Candy labels create no extra
slots. Donut counts as Raider despite its effective rule substitution.

Combat candidates use the effective faction rule. Raider Charge is included
only when its public activation path has at least two cells. Heavy/Juggernaut
Push gets strategic value 1 when `WILL_PUSH` moves a target off an owned city,
onto a lower defense tile, or out of a blocking approach; unknown never scores.
Breacher prioritizes a fortified threatening defender. Medic prioritizes the
lowest HP fraction, then greater missing HP, then target ID.

Normal excludes a Donut Roll crossing `ALLIED_TERRITORY` or containing any
visible owned/allied unit or wall. It scores only visible occupants and never
predicts a hidden victim. Choco Engineer Wall placement maximizes visible
hostile shortest approaches blocked, then avoids a public economic target,
then Grass, Forest, Mountain, `(y,x)`, and unit ID. Candify keeps the v6
footprint/connectivity rules and values hostile above neutral, frontier
adjacency, chosen city ID, then target coordinate. It does not sacrifice the
last defender of a threatened city while a productive defense exists.

## 7. Cooperative mode and information safety

The stored `humanPlayerId` defines relationships exactly as in ruleset 5. AI
seats are allied only to one another in Cooperative mode. Public enumeration
removes allied Attack/Capture/territory paths and allied buildings never count
as friendly economic contributors. There is no shared economy, Road network,
Market connection, processor contribution, vision, healing, capacity, or
technology.

An unexplored allied coordinate is only `ALLIED_TERRITORY`; an explored
technology-hidden resource is only `UNKNOWN_RESOURCE`. Both are content-free.
Game is public on an explored Forest from match start, but cannot produce a Hunt
Game candidate before Hunting. Neither hidden arm counts as frontier, spatial
potential, Roll value, route content, or a research target. Equal views
containing either arm must produce byte-identical candidates, scores, and
commands.

## 8. Runner limits and validation

Normal takes productive actions greedily and keeps no speculative Coin reserve.
The per-turn limit is 128 accepted commands. The runner reserves the number of
slots required to drain the current authoritative pending queue plus End Turn.
A missing candidate, rejection, non-advancing accepted command, or inability to
end is a structured error; it never retries with hidden knowledge.

The required browser/headless matrices and participation metrics are in
[Headless Simulation](HEADLESS_SIMULATION.md) and
[POC Validation](../validation/POC_VALIDATION.md). Animation, reduced motion,
Fast Forward, and controller pacing cannot alter candidates, commands, events,
or hashes.
