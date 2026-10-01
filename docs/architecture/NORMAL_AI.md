# Greedy Normal AI

## Revision-11 bounded tactical policy (current under revision 12)

The production policy consumes only the legal public schema, commands, and
previews under `pulp-wars-poc-7r18`. Role facts resolve through the owner's
faction registration; the revision-13 Undead tactics, the revision-14
Plague, Bitten, Tend-cure, and Vampire play, the revision-15 Plague
duration valuation, the endgame siege mode (`pulp_wars-1mc`), the
revision-17 Goblin play (`pulp_wars-0ao.6`), and the revision-18 movement
estimates (`pulp_wars-6gd.2`) are summarized below.
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
different result. This policy limitation does not change Redevelop legality:
Normal does not relocate established one-per-city buildings.

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
integration, so it is not represented as a pre-refactor golden. On the
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
