# Text-mode play

`npm run play:text` lets an agent play one seat of a Ruleset 7 match in text,
turn by turn, against the Normal AI (`pulp_wars-w49.1`). It exists for hand
playtests of balance and economy: the player sees what a browser player sees
and nothing else.

- One command per process invocation; the match lives in a session file.
- Everything printed before `debrief` comes from the playing seat's
  `PlayerViewV7`, the public queries over it (`queryPlayerCommandsV7`,
  `queryCombatPreviewV7`, `previewEconomicV7`, `queryTechnologyTreeV7`, and
  the other public previews), and the events `projectEventsV7` projects for
  that seat.
- The AI seats play as in the browser's normal match: the Normal policy on
  the AI seat's own view, the per-turn command cap, and a command the public
  query offers. The harness changes no rule, no policy, and no identity.
- It is deterministic: the same setup and the same ids give the same text.
- There is no undo.

The code is `scripts/play-text-v7.ts` (the `play:text` script); the test is
`tests/scripts/play-text-v7.test.ts`.

## Commands

```bash
npm run --silent play:text -- new --session S.json --map dry-land --size 11 --seed 7 --factions original,goblin --seat 0
npm run --silent play:text -- view --session S.json
npm run --silent play:text -- tech --session S.json
npm run --silent play:text -- options --session S.json
npm run --silent play:text -- do --session S.json r.HUNTING u2.m.9,3 c1.t.FIGHTER
npm run --silent play:text -- end --session S.json
npm run --silent play:text -- log --session S.json
npm run --silent play:text -- debrief --session S.json --out debrief.txt
```

`--silent` keeps npm's own two header lines out of the output. An invocation
takes about half a second (most of it starting `tsx`); `end` takes longer
with many AI seats.

| Command   | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new`     | Creates the match and the session file. `--map` is `dry-land` (default), `pangea`, `continents`, `archipelago`, or `lakes`; `--size` defaults to the automatic size for the seat count; `--factions` lists one faction per seat, yours first (2 to 8, all different; `human` means `original`, `ice` means `ice_folk`); `--curiosities on\|off` (default on); `--overwrite` replaces an existing file. AI seats ahead of you in the turn order move first. Prints the opening view. |
| `view`    | Header (state number, round, coins, income, players in turn order, a pending choice), the map, your cities, your units, visible other units, known other cities, technologies, achievements, and how many commands are offered. `--full` adds the whole legend, stat modifiers, abilities, building outputs, and trade.                                                                                                                                                             |
| `tech`    | The technology tree: tier, state, cost now, prerequisites, and what each technology unlocks (units with their stats and cost, commands with cost and population, passive effects).                                                                                                                                                                                                                                                                                                  |
| `options` | The offered commands with ids and previews. Without a filter, moves are listed as destinations only. `--unit u12`, `--city c1`, `--tile 4,5` narrow it and describe every command; `--all` describes everything.                                                                                                                                                                                                                                                                    |
| `do`      | Applies the given ids in order. Each is checked against the offered commands and then applied by the engine. It stops at the first rejected id, prints the reason and the ids it did not execute, and exits with code 1; the commands before it stay applied.                                                                                                                                                                                                                       |
| `end`     | Ends your turn; the AI seats play; prints what your seat observed, then the header of your new turn, or the outcome.                                                                                                                                                                                                                                                                                                                                                                |
| `log`     | Your own timeline: one row per turn (coins, income, cities and levels, units by kind, technology count) with the milestones of that round. `--round N` adds what you observed while the other seats played.                                                                                                                                                                                                                                                                         |
| `debrief` | After the game only. Replays the command log with full information and writes, per seat and round, the economy, cities, armies, technology, training, attacks, kills, and losses (`--out FILE`; a `.json` name writes JSON). It refuses an unfinished match unless `--reveal-hidden` is passed.                                                                                                                                                                                     |
| `verify`  | Replays the command log from the setup and compares the state hash.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `help`    | The command list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

`do` and `end` accept `--at N`: the command is refused unless the session is
at state `#N`, the number in every header. Use it when you are not sure the
session is where you last saw it.

## Coordinates and the map

Coordinates are `x,y`. `0,0` is the top-left corner, `x` grows to the right
and `y` downwards. Distance is the larger of the two differences, so a unit
has eight neighbours.

A map cell has seven characters: terrain, feature, mark, territory owner,
and a three-character unit code.

```text
      x8      x9
y2   |.C-00Fi|fa-0---|
```

`.C-00Fi` is grass (`.`), your capital (`C`), no mark (`-`), territory of
seat 0 (`0`), and a Fighter of seat 0 (`0Fi`). `fa-0---` is forest with game
in seat 0's territory and no unit. `view --full` prints the whole legend.
Unit codes are mechanical roles (`Gd` is the Guard role, which the Undead
call a Zombie); the unit lists give the faction's own name.

`???????` is an unexplored tile. The game has no re-fog: once a tile is
explored, you see every unit on it for the rest of the match. A unit on an
unexplored tile, and a city whose center is unexplored, never appear in any
output before `debrief`.

## Ids

An id names what the command does. It is valid exactly while the public
command query offers that command, and it means the same command in every
state, so an id can be built from a unit id and a coordinate without listing
it first. Ids are case-insensitive.

| Id                                        | Command                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `u12.m.4,5`                               | unit 12 moves to `4,5`                               |
| `u12.a.u31`                               | unit 12 attacks unit 31                              |
| `u12.capture`                             | unit 12 captures the settlement it stands on         |
| `u12.recover`, `u12.promote`, `u12.wait`  | recover HP, take a Promotion, mark the unit as done  |
| `u12.fortify`, `u12.pillage`              | build a Field Defense, pillage the improvement       |
| `u12.rally`, `u12.tend`, `u12.disband`    | Captain's Rally and Tend Wounded, disband            |
| `c1.t.FIGHTER`                            | city 1 trains the role                               |
| `c1.grant`                                | Land Grant for city 1                                |
| `c1.reward.WALLS`                         | the pending reward choice of city 1                  |
| `r.FARMING`                               | research                                             |
| `t.4,5.build_farm`, `t.4,5.harvest_fruit` | the tile action at `4,5` (the engine's command name) |
| `t.4,5.monument.EXPLORER`                 | build the monument of an unlocked achievement        |
| `end`                                     | only through the `end` command                       |

Other factions add `.raise`, `.devour`, `.wail`, `.kaboom`, `.coldsnap`,
`.rush`, `.hatch.u7`, `.bolas.u31`, `.mind.u31`, `.tractor.u31`, `.toss.u9`,
`.beam.u7.4,5`, `.bomb.u31.4,5`, `.tunnel.4,5`, `.assemble.4,5`,
`.rebake.4,5`, `.freeze.4,5`, `.board.u31`, `.land.4,5` (disembark), and
`c1.egg.ROLE.4,5`; `options` prints them when they are offered.

A unit keeps its id for its whole life; a city keeps its id across captures.
Roles and technologies use the engine's identifiers (`FIGHTER`, `FARMING`).

## One turn

```text
$ npm run --silent play:text -- options --session S.json
== options at state #12 | round 2 | coins 3 ==
OFFERED 10: tile 1 | move 7 | unit 2 | end available

TILES
t.8,3.hunt_game  hunt game at 8,3 (forest game S0 land) | cost 2c | pop +1 c1 (1/2 -> 2/2 at L1) | income +1/turn c1 | LEVEL UP to 2

UNITS
u2(S0 Fighter) @9,3 hp 12/12
  u2.wait  mark the unit as handled (no effect on the game)
  moves 4 (id u2.m.x,y): 9,2 8,3 10,3 9,4
u5(S0 Fighter) @8,2 hp 12/12
  u5.wait  mark the unit as handled (no effect on the game)
  moves 3 (id u5.m.x,y): 9,1 9,2 8,3

$ npm run --silent play:text -- do --session S.json t.8,3.hunt_game c1.reward.STOCKPILE u2.m.9,4 u5.m.9,3
OK t.8,3.hunt_game -> state #13
  GAME_HUNTED playerId=S0 cityId=c1 at=8,3 cost=2 permanentPopulationAdded=1
  CITY_LEVELED_UP c1 to level 2
  CITY_REWARD_QUEUED cityId=c1 reachedLevel=2 candidates=[SURVEY; STOCKPILE]
OK c1.reward.STOCKPILE -> state #14
  CITY_REWARD_CHOSEN playerId=S0 cityId=c1 reachedLevel=2 reward=STOCKPILE coinDelta=4
OK u2.m.9,4 -> state #15
  MOVE u2(S0 Fighter) 9,3>9,4
  REVEALED 3 tiles: 8,5 9,5 10,5
OK u5.m.9,3 -> state #16
  MOVE u5(S0 Fighter) 8,2>9,3
== state #16 | round 2 | coins 5 | income +3/turn ==
OFFERED 4: research 3 | train 1 | end available

$ npm run --silent play:text -- end --session S.json
END OF YOUR TURN (round 2)
-- S1 Goblin plays (round 2) --
-- your turn starts: coins 8 --
  INCOME S0 +3 (c1 +3)

== state #20 | pulp-wars-poc-7r44 | dry_land 11x11 seed 7 ==
ROUND 3 | you are S0 Human | YOUR TURN | coins 8 | income +3/turn | cities 1 | units 2
PLAYERS in turn order: S0 Human (you) active cities 1 units 2 > S1 Goblin (AI) active cities 1 units 2
OFFERED 17: research 5 | train 1 | move 9 | unit 2 | end available
```

The Goblin seat's turn printed nothing because nothing it did was on a tile
this seat has explored.

## Reading the output

- **Unit lines.** `u20 Guard [GUARD] @4,4 hp 17/17 atk 1.5 def 4.5 mov 1 rng 1
home c1 fresh options 6`: the stats are the current totals with every
  modifier that applies where the unit stands (here the forest's Defense
  bonus). `fresh` means it has done nothing this turn; `moved`, `attacked`,
  and so on name what it has done; `spent` is a unit that arrived this turn.
  `options` is how many commands are offered for it now.
- **Attack previews** are exact: `u20.a.u24 attack u24(S1 Skeleton) @3,5:
deals 2 (hp 10->8) | takes 6 (hp 17->11) | atk 1.5 vs def 2 x3/2`. `KILLS`
  and `ATTACKER DIES` are spelled out; `no retaliation (OUT_OF_RANGE)` gives
  the reason; `x3/2` is the defender's Defense bonus and `fort N` its
  fortification level. Anything else that applies follows as `name=value`
  (`chargeApplied=yes`, `advances=yes`, `attackerBitten=yes`, a `splash`
  list).
- **Economy previews** give the cost, the population change of the city with
  its meter before and after, the income change, and `LEVEL UP to N` when the
  command levels the city. A level-up queues a reward choice, and nothing
  else is offered until you choose it (`PENDING CHOICE` in the header).
- **Move lines** say what stands on the destination and which hostile units
  would be next to it.
- **City lines.** `slots 2/3` is used and total unit capacity; `action ready`
  means the city can still train or use Land Grant this turn. The `train`
  line lists every unlocked role with its cost here and either its id or why
  it is not offered (`center occupied`, `too dear`, `no free slot`, `city
action used`).
- **Events** are the engine's projected events. The common ones have a short
  form (`MOVE`, `COMBAT`, `DIED`, `TRAINED`, `RESEARCHED`, `INCOME`,
  `REVEALED`, `CITY_CAPTURED`, `CITY_LEVELED_UP`); every other event prints
  its kind and its fields. Unit ids carry their owner and kind
  (`u24(S1 Skeleton)`), `S1` is a seat, `c17` a city.

## Tips for an agent playing

- The turn loop is `view` (or just the header `end` printed) → `options` →
  `do` → `end`. `options` is the cheap one to repeat; `view` is for the map.
- Put several ids in one `do` when they do not depend on each other. After a
  command that can level a city, expect the list to stop at the reward
  choice: choose it and send the rest again.
- Ending the turn with idle units is allowed. A wounded idle unit in the
  right place recovers by itself (the `recover` preview says how much).
- A unit captures a settlement it stands on with `.capture`; `can-capture-now`
  in its unit line says when. Move onto the center first.
- Research costs grow with the number of cities you own; the first
  technology is free. `tech` shows the cost now.
- Use `options --unit u12` before a fight: it lists that unit's attacks with
  exact numbers and, under `COMMANDS TARGETING IT`, your attacks on an enemy
  unit when you pass the enemy's id.
- `log` is your notebook of what happened; `log --round N` shows again what
  the AI did in a round you want to look at.
- Do not read a `debrief` of a match you are still playing.

## The session file

The session file holds the setup, the accepted commands of every seat, the
serialized state with its hash, and the playing seat's journal (the rows and
milestones `log` prints, built from public information). Loading parses the
state with the engine's strict state schema and checks the hash and the
command count; `verify` and `debrief` replay the whole log from the setup.

A session belongs to one ruleset identity. After the identity changes, a
session is refused as stale; start a new one.

## Limits

- The playing seat is seat 0, the engine's human seat. Its place in the turn
  order is drawn from the seed like every seat's.
- The debrief lists attacks made, not attacks the AI considered and declined:
  the Normal policy has no telemetry for those.
- The naval commands are offered and described like the others, but only Dry
  Land has been played through.
