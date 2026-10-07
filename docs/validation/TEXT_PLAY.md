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

**Without `npm` on PATH** (an agent's sandbox shell often has neither `npm`
nor `node`), use the checked-in wrapper `scripts/play-text`, which takes the
same commands from any working directory:

```bash
scripts/play-text view --session S.json
```

It uses `node` from PATH, or else the pinned Node under
`~/.local/pulp-wars-tools/node-v*/bin`. The equivalent by hand is to put
that directory first on PATH, for example
`PATH=/Users/nadbor/.local/pulp-wars-tools/node-v24.21.0-darwin-arm64/bin:$PATH`.

## Commands

```bash
npm run --silent play:text -- new --session S.json --map dry-land --size 11 --seed 7 --factions original,goblin --seat 0
npm run --silent play:text -- view --session S.json
npm run --silent play:text -- tech --session S.json
npm run --silent play:text -- options --session S.json
npm run --silent play:text -- do --session S.json r.HUNTING u2.m.9,3 c1.t.FIGHTER
npm run --silent play:text -- end --session S.json
npm run --silent play:text -- do --session S.json u2.a.u31 u5.m.9,4 --end
npm run --silent play:text -- log --session S.json
npm run --silent play:text -- debrief --session S.json --out debrief.txt
```

The faction you play is the first of `--factions`; the others are Normal
AI seats. The four pairings of the Human tuning on a dry-land map:

```bash
# You play the Humans against Goblins, then against Undead.
npm run --silent play:text -- new --session hg.json --map dry-land --size 11 --seed 7 --factions original,goblin
npm run --silent play:text -- new --session hu.json --map dry-land --size 11 --seed 7 --factions original,undead
# You play the Goblins or the Undead against the Human AI.
npm run --silent play:text -- new --session gh.json --map dry-land --size 11 --seed 7 --factions goblin,original
npm run --silent play:text -- new --session uh.json --map dry-land --size 11 --seed 7 --factions undead,original
```

`--silent` keeps npm's own two header lines out of the output. An invocation
takes about half a second (most of it starting `tsx`); `end` takes longer
with many AI seats.

| Command   | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new`     | Creates the match and the session file. `--map` is `dry-land` (default), `pangea`, `continents`, `archipelago`, or `lakes`; `--size` defaults to the automatic size for the seat count; `--factions` lists one faction per seat, yours first (2 to 8; `human` means `original`, `ice` means `ice_folk`; a faction may repeat, so `original,original` is a mirror against the Human AI); `--curiosities on\|off` (default on); `--overwrite` replaces an existing file. AI seats ahead of you in the turn order move first. Prints the opening view. |
| `lab`     | Starts a staged position instead of a generated match: `lab --session S.json LAB_SIEGE` (or `LAB_BACKLINE`, `LAB_LATE`; `--overwrite` as for `new`). You play the Human seat against the Normal AI and move first (in `LAB_GOBLIN_MID` you play the Goblins, in `LAB_UNDEAD_MID` the Undead, in `LAB_MARTIAN_MID` the Martians, in `LAB_DINOSAUR_MID` the Dinosaurs). `lab` alone lists the labs. See [Labs](#labs).                                                                                                                                |
| `view`    | Header (state number, round, coins, income, players in turn order, a pending choice), the map, your cities, your units, visible other units, known other cities, technologies, achievements, and how many commands are offered. `--full` adds the whole legend, stat modifiers, abilities, building outputs, and trade.                                                                                                                                                                                                                             |
| `tech`    | The technology tree: tier, state, cost now, prerequisites, and what each technology unlocks (units with their stats and cost, commands with cost and population, passive effects).                                                                                                                                                                                                                                                                                                                                                                  |
| `options` | The offered commands with ids and previews. Without a filter, moves are listed as destinations only, and many offers of one kind (Roads, Monuments, the hires of a Market) are one line with the count, the id pattern, and the tiles. `--unit u12`, `--city c1`, `--tile 4,5` narrow it and describe every command; `--all` describes everything.                                                                                                                                                                                                  |
| `do`      | Applies the given ids in order. Each is checked against the offered commands and then applied by the engine. It stops at the first rejected id, prints the reason and the ids it did not execute, and exits with code 1; the commands before it stay applied. With `--end` it then ends the turn, only if every id was applied and the turn can end (otherwise it prints `TURN NOT ENDED` and exits with code 1).                                                                                                                                   |
| `end`     | Ends your turn; the AI seats play; prints what your seat observed, then the header of your new turn, or the outcome. It is refused right after a `do` that stopped at a rejected id (see below); `--force` ends the turn anyway.                                                                                                                                                                                                                                                                                                                    |
| `log`     | Your own timeline: one row per turn (coins, income, cities and levels, units by kind, technology count) with the milestones of that round. `--round N` adds what you observed while the other seats played.                                                                                                                                                                                                                                                                                                                                         |
| `debrief` | After the game only. Replays the command log with full information and writes, per seat and round, the economy, cities, armies, technology, training, attacks, kills, and losses (`--out FILE`; a `.json` name writes JSON). It refuses an unfinished match unless `--reveal-hidden` is passed.                                                                                                                                                                                                                                                     |
| `verify`  | Replays the command log from the setup and compares the state hash.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `help`    | The command list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

`do` and `end` accept `--at N`: the command is refused unless the session is
at state `#N`, the number in every header. Use it when you are not sure the
session is where you last saw it.

**Ending a turn safely.** A `do` list stops at the first rejected id, and a
shell line such as `do a b c; end` would still run the `end` and lose the
rest of the turn. Two guards prevent that:

- `do a b c --end` ends the turn only when `a`, `b`, and `c` were all
  applied. This is the form to use when the ids are the whole turn.
- A plain `end` issued right after a `do` that stopped at a rejected id is
  refused: `ERROR: turn NOT ended: your last do stopped at the rejected id
u5.m.9,9 and did not execute u7.a.u31. …`. Issue another `do` (any `do`
  clears the guard, whatever it does), or pass `end --force` to end the
  turn as it stands. `view`, `options`, `tech`, and `log` do not clear it.

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
in seat 0's territory and no unit. `view` prints the legend of the cell and
of the feature letters under the map; `view --full` prints the whole legend
(terrain, marks, and unit codes too).
Unit codes are mechanical roles (`Gd` is the Guard role, which the Undead
call a Zombie); the unit lists give the faction's own name.

**The ninth unit and the technology names (`pulp-wars-poc-7r55`,
[its record](../product/RULESET_7_NINTH_UNIT.md)).**

- **Technologies.** Commands, ids, and this document use the technology
  ID (`r.DRILL`, `DRILL`). Wherever the name the player sees differs from
  the ID, `tech`, `options`, `view`, the log, and `debrief` print the ID
  and then the name in quotes: `DRILL "Garrison"`, `METALLURGY "Armoury"`,
  `SAWMILLING "Liches"` for an Undead seat. Eight shared names changed
  (Garrison, Leadership, Land Grants, Pathfinding, Armoury, Sailing,
  Shipbuilding, Boarding) and a faction names several nodes after its own
  building or unit.
- **The heavy line unit** is the role `SWORDSMAN` for every faction and
  needs `METALLURGY`. Its map code is `Ch` (the Human Champion, the
  Swordsman until `7r55`), and a faction with its own code prints a legend
  line: `Wi` wight, `Og` ogre, `ST` shock trooper, `Jb` jawbreaker, `Tc`
  triceratops, `Mm` mammoth, `Tk` steam tank.
- **Three roles have a new unit:** the Dinosaur `CATAPULT` is the
  Stegosaurus (`Sg`), the Ice Folk `GUARD` the Musk Ox (`Ox`), and the
  Dwarf `KNIGHT` the Whirligig (`Wh`). A Triceratops is `[SWORDSMAN]` in a
  unit line, a Mammoth too, and a Steam Tank too.
- **Previews.** An attack on a Shielded Shock Trooper from the next tile
  says what the attacker takes from the Shock Field; a Stegosaurus's shot
  says the target is Cracked (1 less Defense this turn); an attack on a
  Musk Ox says the attacker is Chilled; a Whirligig's unit line says how
  many of its three attacks remain, and a unit it has attacked this turn
  is no longer offered as its target.
- **A Wight's marked Grave** (since the Undead hand pass, `pulp_wars-w49.20`;
  before it the harness printed nothing for one). The map cell has the
  mark `w` where a plain Grave has `x`. Under the map, after `graves:`,
  `view` lists the marked ones with their seat and what stands on each:
  `Wight's Graves (a Wight returns with 7 HP at its owner's turn start
unless a unit stands there): 6,1(S0, under u70(S1 Guard)) 7,2(S0, free)`.
  A tile's description (a Move line, `options --tile`) names it: `WIGHT'S
GRAVE of S1 (a Wight returns here with 7 HP at the start of S1's turn)`,
  and a plain Grave reads `grave`. The return itself prints as
  `WIGHT_RISEN playerId=S0 unitId=u87(S0 Wight) at=7,2 hp=7` at the start
  of the owner's turn.
- **Labs.** Every Human seat that fields Champions owns Metallurgy; in the
  four labs in which you play another faction your seat owns Engineering
  and Metallurgy too (twelve technologies), so its heavy can be produced.
  The lab table below was written before `7r55`: read "Champion" for
  "Swordsman", 17 technologies for `LAB_LATE`'s 16, 67 Coins for the
  player's 63 in the breakthrough labs (the Goblin and Undead attackers
  are 1.87 times that, not twice), and 80 Coins for the Human side's 77 in
  the middle-game labs.

`???????` is an unexplored tile. The game has no re-fog: once a tile is
explored, you see every unit on it for the rest of the match. A unit on an
unexplored tile, and a city whose center is unexplored, never appear in any
output before `debrief`.

## Labs

Six staged positions for the Human tuning. The first three
([round 4](../product/RULESET_7_TUNING_HUMAN.md#119-the-labs); `LAB_BACKLINE`
and `LAB_LATE` are at revision 3 since the ninth unit, `7r55`; revision 2
since [round 5](../product/RULESET_7_TUNING_HUMAN.md#12-round-5), with Swordsmen) are each a
hidden mirror mission (`src/engine/v7/missions/lab-human.ts`); the three
breakthrough labs of
[round 6](../product/RULESET_7_TUNING_HUMAN.md#132-the-bar-numbers-against-a-prepared-line)
(`src/engine/v7/missions/lab-breakthrough.ts`) are not mirrors: you are
Human and hold a line, and the AI attacks it as a Human, a Goblin, or an
Undead seat; `LAB_GOBLIN_MID`, `LAB_UNDEAD_MID`, `LAB_MARTIAN_MID`, and
`LAB_DINOSAUR_MID` (`lab-goblin.ts`, `lab-undead.ts`, `lab-martian.ts`,
`lab-dinosaur.ts`) are the four in which you play another faction. Each is an
ordinary match from a fixed start: every command, `verify`, and `debrief`
work as in a generated match.

| Lab                       | Position                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LAB_SIEGE`               | 11 x 11. The AI's walled level-4 capital with a Guard on the center, three Guards in front (Forest cover, a Field Defense), a Marksman and two Catapults behind, and a Mountain touching the screen; the AI holds its formation. You have 6 units, 60 Coins, and the prerequisites of Sawmilling, Chivalry, Explosives, and Fieldcraft.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `LAB_BACKLINE`            | 14 x 14. The AI advances with four Catapults and three Marksmen behind two Guards, a Swordsman, and two Fighters. You have three Knights, two Raiders, a Swordsman, two Fighters, two Marksmen, a Catapult, and 40 Coins.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `LAB_LATE`                | 16 x 16. Six road-linked cities a side, 16 technologies (Engineering among them), armies at the unit limit with a Swordsman in every front city, 100 Coins each, two of your cities with a Barracks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `LAB_BREAKTHROUGH`        | 16 x 16. You hold the one crossing between two lakes, eight tiles wide, with 14 units (63 Coins): Guards on two Mountains and two Field Defenses, four Swordsmen in Forests, three Marksmen and two Catapults behind, a walled capital with a Guard two tiles behind the line (its land reaches the line, so the Field Defenses count), and two more cities; 22 Coins in hand, every unit slot filled, 12 Coins a turn. The Human AI stands out of reach with 26 units (125 Coins, twice yours) and three level-4 cities: 13 Coins in its first turn, 15 in its second, 19 a turn from its third. Revision 2 since tuning round 7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `LAB_BREAKTHROUGH_GOBLIN` | The same line; the AI is Goblin with 33 units (125 Coins): Orc Brutes, Goblins, Bomb Chuckers, Rocket Carts, Scrap Buggies, Wolf Riders, a Warboss.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `LAB_BREAKTHROUGH_UNDEAD` | The same line; the AI is Undead with 29 units (127 Coins): Zombies, Skeletons, Banshees, Liches, Vampires, Ghouls, a Necromancer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `LAB_GOBLIN_MID`          | 16 x 16. **You play the Goblins** against the Human AI in an even middle game ([the Goblin pass](../product/RULESET_7_TUNING_GOBLIN.md#9-the-lab)): five cities a side (a level-4 capital, two level-3, two level-2 at the front, four tiles apart), 15 Coins a turn each, ten technologies each. You can train every Goblin unit and hold 6 Goblins, 4 Bomb Chuckers, 3 Wolf Riders, 3 Orc Brutes, a Warboss, 2 Rocket Carts, and a Scrap Buggy (63 Coins), 35 Coins on the first turn, and four free unit slots. The Humans hold 3 Swordsmen, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards, and 5 Fighters (77 Coins), a walled capital, and Forest cover.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `LAB_UNDEAD_MID`          | 16 x 16. **You play the Undead** against the Human AI in an even middle game ([the Undead pass](../product/RULESET_7_TUNING_UNDEAD.md#9-the-lab)), on the board and against the Human side of `LAB_GOBLIN_MID`: five cities a side (a level-4 capital, two level-3, two level-2 at the front, four tiles apart), 15 Coins a turn each, ten technologies each. You can train every Undead unit and hold 4 Skeletons, 4 Zombies, 2 Ghouls, 2 Banshees, a Necromancer, 2 Liches, and a Vampire (62 Coins), 35 Coins on the first turn, and three free unit slots (the capital and one front city are full). The Humans hold 3 Swordsmen, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards, and 5 Fighters (77 Coins) at the start and 30 Coins on their first turn (they train more Knights at once), a walled capital, and Forest cover. Your units recover only in your own land, and your Liches plague only once you research Pestilence (Fortification, then Explosives).                                                                                                                                                                            |
| `LAB_MARTIAN_MID`         | 16 x 16. **You play the Martians** against the Human AI in an even middle game ([the Martian pass](../product/RULESET_7_TUNING_MARTIAN.md#9-the-lab)): five cities a side (a level-4 capital, two level-3, two level-2 at the front), 15 Coins a turn each, ten technologies each, on land that is not bare (Forest and Fertile Ground in every city's land, Ore by the three larger ones, Game, four Lumber Camps a side). You can train every Martian unit and hold 5 Grunts, 2 Shield Projectors, 2 Saucers, 2 Ray Gunners, a Brain, 2 Tripods, and a Mothership (15 units, 70 Coins), 35 Coins on the first turn, and three free unit slots (the capital and one front city are full; a Mothership fills two). You do not own Force Fields or Heat Sinks: your Shield Projectors raise no Shield but their own and your Ray Gunners overheat until you research them. The Humans hold 3 Swordsmen, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards, and 5 Fighters (17 units, 77 Coins) at the start and 30 Coins on their first turn, a walled capital, a walled level-3 city, and Forest cover.                                                 |
| `LAB_DINOSAUR_MID`        | 16 x 16. **You play the Dinosaurs** against the Human AI in an even middle game ([the Dinosaur pass](../product/RULESET_7_TUNING_DINOSAUR.md#9-the-lab)), on the land and against the Human side of `LAB_MARTIAN_MID`: five cities a side (a level-4 capital, two level-3, two level-2 at the front), 15 Coins a turn each, ten technologies each. You can produce every Dinosaur unit and hold 3 Cavemen, 2 Raptors (one Big), 2 Spitters (one Big), 2 Ankylosauruses, a Shaman, 2 Triceratops (one Big), and a T-Rex Egg beside your capital, two turns from hatching, with the Shaman next to it (12 units and the Egg, 67 Coins), 35 Coins on the first turn, and three free unit slots (two in the capital, one in the northern level-3 city; a Triceratops and a T-Rex fill two). You own neither Nesting (one more unit slot in every city, Eggs with 10 HP) nor Wallbreaker (the second tile of a Triceratops's run-up). The Humans hold 3 Swordsmen, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards, and 5 Fighters (77 Coins) at the start and 30 Coins on their first turn, a walled capital and a walled level-3 city, and Forest cover. |

### Dinosaur seats

Since the correction of
[the Dinosaur pass](../product/RULESET_7_TUNING_DINOSAUR.md#137-text-and-the-tool):

- **Map codes.** A Dinosaur unit has its own code, and a match with a
  Dinosaur seat prints the legend line `Dinosaur units: Cv caveman Rp
raptor Sp spitter Ak ankylosaurus Sh shaman Tc triceratops Tx t-rex Bo
brontosaurus` (a Triceratops read `Ct`, as a Human Catapult).
- **City lines.** A unit that is not offered says why: `needs 2 free
slots, the city has 1` for a Triceratops or a T-Rex, `no free tile next
to the city` for an Egg, `center occupied` only for a trained unit.
- **The run-up.** `options --unit u7` adds to each Move of a Triceratops
  the run-up it gives and, for each enemy the Move ends next to, about
  what the Charge! would deal (`run-up 1 tile: Charge! +1 Attack; on
u82(S1 Swordsman) about 11 (hp 15->4)`). With Wallbreaker a tile one
  step away is also offered by a two-tile path, as `u7.run.4,5`; the
  ordinary `u7.m.4,5` is the one-tile Move.
- **Pack Hunt.** An attack line of a Caveman ends with `Pack Hunt +1 (in
the numbers)` when it applies, and the estimate of an enemy Caveman's
  attack counts it when a dinosaur of that enemy is within three tiles.
- **Hire.** The hire line of a Market names every role (`Triceratops
[CATAPULT] 12c`) and lists the ones the Coins do not reach as `too
dear`.
- **Names.** The technology tree and the debrief print the faction's
  names: `FORTIFICATION "Nesting"`, `SAWMILLING "Timber"`,
  `cmd BUILD_SAWMILL "Chopping Block"`, "Triceratops" where a role id
  stood.

## Ids

An id names what the command does. It is valid exactly while the public
command query offers that command, and it means the same command in every
state, so an id can be built from a unit id and a coordinate without listing
it first. Ids are case-insensitive.

| Id                                        | Command                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `u12.m.4,5`                               | unit 12 moves to `4,5`                                                                                  |
| `u12.a.u31`                               | unit 12 attacks unit 31                                                                                 |
| `u12.capture`                             | unit 12 captures the settlement it stands on                                                            |
| `u12.recover`, `u12.promote`, `u12.wait`  | recover HP, take a Promotion, mark the unit as done                                                     |
| `u12.fortify`, `u12.pillage`              | build a Field Defense, pillage the improvement                                                          |
| `u12.rally`, `u12.tend`, `u12.disband`    | Captain's Rally and Tend Wounded, disband (on a mind-controlled unit: Release, it returns to its owner) |
| `c1.t.FIGHTER`                            | city 1 trains the role                                                                                  |
| `c1.hire.KNIGHT.9,9`                      | city 1 hires the role on its Market at `9,9`                                                            |
| `c1.grant`                                | Land Grant for city 1                                                                                   |
| `c1.reward.WALLS`, `c1.reward.SCOUTS`     | the pending reward choice of city 1                                                                     |
| `r.FARMING`                               | research                                                                                                |
| `t.4,5.build_farm`, `t.4,5.harvest_fruit` | the tile action at `4,5` (the engine's command name)                                                    |
| `t.4,5.monument.EXPLORER`                 | build the monument of an unlocked achievement                                                           |
| `end`                                     | only through the `end` command                                                                          |

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
  CITY_REWARD_QUEUED cityId=c1 reachedLevel=2 candidates=[SCOUTS (free Raider); STOCKPILE]
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

== state #20 | pulp-wars-poc-7r49 | dry_land 11x11 seed 7 ==
ROUND 3 | you are S0 Human | YOUR TURN | coins 8 | income +3/turn | cities 1 | units 2
PLAYERS in turn order: S0 Human (you) active cities 1 units 2 > S1 Goblin (AI) active cities 1 units 2
OFFERED 17: research 5 | train 1 | move 9 | unit 2 | end available
```

The Goblin seat's turn printed nothing because nothing it did was on a tile
this seat has explored.

A city is printed with its command id and, beside it, the name the game
shows ([docs/ui/CITY_NAMES.md](../ui/CITY_NAMES.md)): `c1 Bellory CAPITAL
@8,8`, `CITY_LEVELED_UP c1 Bellory to level 2`, `capture city c7 Snagrot`.
Commands take the id alone. The example above predates the names.

## Reading the output

- **Unit lines.** `u20 Guard [GUARD] @4,4 hp 17/17 atk 1.5 def 4.5 mov 1 rng 1
home c1 fresh options 6`: the stats are the current totals with every
  modifier that applies where the unit stands (here the forest's Defense
  bonus). `fresh` means it has done nothing this turn; `moved`, `attacked`,
  and so on name what it has done; `spent` is a unit that arrived this turn.
  `options` is how many commands are offered for it now.
- **Attack previews** are exact: `u20.a.u24 attack u24(S1 Skeleton) @3,5:
deals 2 (hp 10->8) | takes 5 (hp 17->12) | atk 1.5 vs def 2 x3/2`. `KILLS`
  and `ATTACKER DIES` are spelled out; `no retaliation (OUT_OF_RANGE)` gives
  the reason; `x3/2` is the defender's Defense bonus. A fortified defender
  is broken down: `def 3 (1 open to ranged + fort 2)` is a Guard shot at
  from two tiles (Defense 1 against ranged attacks) on a Field Defense
  (two fortification levels, 1 Defense each), and `def 5 (3 + fort 2)` is
  the same Guard attacked hand to hand; `def 1 (open to ranged)` is the
  Guard with no fortification; `def 3 (bones)` is an Undead Skeleton shot
  at from two tiles (Defense 3 against ranged attacks, 2 hand to hand).
  Both describe the damage you deal: what you take
  back comes from the defender's base Defense alone, without fortification
  or cover. `advances to x,y` says that the unit will move onto the
  target's tile (after a kill by a melee unit, or following a Charge!
  push); it is not a choice. `stays` after `KILLS` says that it will not
  (a ranged unit never advances; some units and tiles do not allow it).
  Anything else that applies follows as `name=value`
  (`chargeApplied=yes`, `breachApplied=yes`, `attackerBitten=yes`, a
  `splash` list).
- **Unit notes.** A unit line ends with what its card says and its
  numbers do not: a Guard is `Open to ranged: Defense 1 against attacks from
2 or more tiles` and `strikes back with its Defense 3, not its Attack`
  (every unit strikes back with its Defense; the note is on a unit whose
  Defense is a point or more above its Attack, which is why a Guard deals
  a Skeleton 3 when it attacks and 8 when it is attacked), a Ghoul is
  `Carrion: +1 Attack against a Bitten or Plagued unit`, a Lich is
  `Plague needs Pestilence`, a Raider's Charge states when it applies,
  and an attack that grants an Overrun says `Overrun: advances and may
attack again after this kill`; a kill after which the unit cannot advance
  (the victim stands on a tile it cannot enter, or rises in place) says
  `Overrun ends: it does not advance after this kill`. A Blast Mountain line names the unit that `sets the charge and
is not hit`.
- **Reward names.** A Human seat's level-2 reward is printed as `SCOUTS`
  (the engine's `SURVEY`, which also gives a Raider); `c1.reward.SURVEY`
  is still accepted.
- **Economy previews** give the cost, the population change of the city with
  its meter before and after, the income change, and `LEVEL UP to N` when the
  command levels the city. A level-up queues a reward choice, and nothing
  else is offered until you choose it (`PENDING CHOICE` in the header).
- **Move lines** say what stands on the destination and which hostile units
  would be next to it. A Move that ends on the Fountain of Youth is followed
  by what the Fountain does (`a land unit that starts your turn here heals
up to 12 HP`), and the heal itself prints as `FOUNTAIN u7(S0 Fighter) @6,6
healed +3 (hp 7->10)` at the start of your turn; a unit at full HP prints
  nothing.
- **Achievement meters** say what they count: `SLAYER` the most kills by
  one living unit, `MUSTER` the different unit kinds you can train that
  you have on the board at once (a reward-only unit such as the
  Abomination does not count), `ENGINEER` the highest output of one
  Windmill, Sawmill, Forge, or Workshop (Mines do not count).
- **Land Grant** lines give the price as charged: `Land Grant for 5c (1c
per tile, at least 1c; ...)`.
- **City lines.** `slots 2/3` is used and total unit capacity; `action ready`
  means the city can still train or use Land Grant this turn. The `train`
  line lists every unlocked role with its cost here and either its id or why
  it is not offered (`center occupied`, `too dear`, `no free slot`, `city
action used`). When no city can train, `options` still prints a `TRAIN`
  section with the reason for every city (`nothing to train: c1 no free
slot (3/3) | c9 center occupied`), and a rejected `c1.t.fighter` names the
  same reason.
- **A `REVEALED` line names what is worth walking to** among its tiles: a
  village, a chest, a city, or a curiosity (`REVEALED 24 tiles: 5,7 6,7
... | among them: village 6,7, village 9,7`). It lists at most sixteen
  coordinates and names every find among all of them.
- **Events** are the engine's projected events. The common ones have a short
  form (`MOVE`, `COMBAT`, `DIED`, `TRAINED`, `RESEARCHED`, `INCOME`,
  `REVEALED`, `CITY_CAPTURED`, `CITY_LEVELED_UP`; the capture of a city you
  have not explored reads `CITY_CAPTURED a city out of your sight by S1`
  and names no city); a Captain's cure of a unit you bit or plagued reads
  `CURED: u70(S1 Captain) cured the bite of u64(S1 Swordsman)` (you get
  it when you see both units); every other event prints
  its kind and its fields. Unit ids carry their owner and kind
  (`u24(S1 Skeleton)`), `S1` is a seat, `c17` a city.

## Tips for an agent playing

- The turn loop is `view` (or just the header `end` printed) → `options` →
  `do` → `end`. `options` is the cheap one to repeat; `view` is for the map.
- Put several ids in one `do` when they do not depend on each other. After a
  command that can level a city, expect the list to stop at the reward
  choice: choose it and send the rest again. End the turn with `--end` on
  the last `do` rather than with a second shell command.
- Ending the turn with idle units is allowed. A wounded idle unit in the
  right place recovers by itself (the `recover` preview says how much).
- A unit captures a settlement it stands on with `.capture`; `can-capture-now`
  in its unit line says when. Move onto the center first.
- Research costs its tier's base (5 / 7 / 9 Coins) plus 1 / 2 / 3 Coins
  for each city you own beyond your first (the technologies you own do not
  matter); the first technology is free. `tech` shows the cost now and
  prints your city count and the three formulas in its first line.
- Every city of yours is offered its faction's giant once, as a level
  reward at level 6 or higher (level 5 offers Treasury or Barracks). From
  level 4 a city that has not taken it has a `giant unit:` line under it
  in `view`.
- A Windmill, Sawmill, Forge, or Workshop counts every Farm, Lumber Camp,
  or Mine of yours next to it, on any of your cities' land, and one Farm
  can feed two cities' Windmills. The build preview shows the output.
- Use `options --unit u12` before a fight: it lists that unit's attacks with
  exact numbers and, under `COMMANDS TARGETING IT`, your attacks on an enemy
  unit when you pass the enemy's id.
- `options --unit` on an enemy unit also lists, under `WHAT IT WOULD DEAL TO
YOUR UNITS NEXT TURN`, what it would deal to each of your units it can
  reach, and on your own unit, under `ENEMY ATTACKS ON IT NEXT TURN`, what
  each visible enemy would deal to it. It is an estimate
  from what you can see (`deals about 6 (hp 17->11)`, `KILLS`,
  `after moving into range`); a unit you cannot see is not in it. A unit
  that cannot attack after it moves (a Guard, a Zombie, an Orc Brute, a
  Catapult, a Lich, a Rocket Cart) counts only from where it stands:
  `no attack on it next turn (it cannot attack after it moves; it is 3
tiles away)`. Each line is one attacker alone; the last line, `COMBINED
worst case: all 3 in turn deal about 14 (hp 15->1)`, is every listed
  attacker in turn, each on the HP the others leave.
- A rejected move of a Raider that has attacked and still has its Escape
  says where the Escape reaches: `the Raider's Escape does not reach it (3
tiles away): after its attack it may still move to 6,4 6,5`.
- `DISBANDED u55(S1 Zombie) @4,11 by its owner: it left the board (no
grave, no kill)` in what your seat observed is another seat's Disband of
  a unit you could see. Your own Disband prints `DISBANDED u12(S0 Fighter)
@3,4 for +1c`.
- A rejected move says why: `"u12.move.7,4" is not an offered move at
state #20: the tile is 3 tiles away and the Fighter has Move 1` (the unit
  has moved, the tile is occupied or unexplored, too far, or the rules
  that end a Move early).
- A Monument you have earned is one line at the top of `options` and under
  `options --city`: `FREE MONUMENT <achievement>: 0c, +3 population in the
city it is built in`, with an id to use.
- `HIT_UNSEEN u12(S0 Guard) @7,2 takes 6 from a source you do not see (hp
17->11)` in what your seat observed is damage from an attacker on a tile
  you have not explored. It names no attacker.
- When a unit has no attack or no `fortify`, `options --unit u12` ends with
  a `no attack: …` or `no fortify: …` line that names the reason (a Guard
  cannot attack after it has moved; only some roles build Field Defense,
  and only before moving, on a tile of your territory, for 3 Coins).
- With Commerce, the line under each of your cities says how land trade
  stands: `Land trade +2: linked by Road to another of your cities`, or
  `No land trade: no Road link to another of your cities`. Every linked
  city earns, the capital too.
- With Commerce, an empty Market offers `c1.hire.<ROLE>.x,y`: a second unit
  a turn in that city, at 1.5 times its price, without the city action.
  The unit arrives on the Market tile with its turn spent, and the city may
  hold one unit above its limit this way. The event line starts `HIRED`
  and names the Market's city and tile
  (`HIRED u5(S0 Knight) at the Market of c1 @7,7 for 14c`); a unit trained
  on the center reads `TRAINED ... in c1`.
- A Goblin unit's `uN.kaboom` line lists the units its blast and any chain
  would hit and no others, each with its damage, `YOURS` for your own, and
  `DIES`, or `hits nobody`; then the totals for the enemy and for you, and
  `this unit dies`.
- The `tech` line of Administration says what a Market pays: 2 or 3 Coins
  every turn (1, plus 1 for each family of buildings beside it: farms,
  timber, metal; 3 at most).
- `t.x,y.blast_mountain` (Explosives) is an explosion: its `options` line
  lists every visible unit on the Mountain and around it that takes 5
  damage, yours included. Outside your territory it needs one of your
  land units next to the Mountain, and that unit is hit too.
- Forest gives cover (× 1.5 Defense) only to a seat with Forestry. A unit
  line shows the cover in `def` and, with `view --full`, as a modifier, for
  enemy units too.
- `SLAYER n/7` in the `ACHIEVEMENTS` line is the most kills held by one of
  your units that is still on the board, not your total kills; a unit line
  shows `kills n`. The line says what each achievement counts: `EXPLORER
n/N` is tiles explored against half the map, `CONQUEROR` needs an enemy
  capital (another enemy city does not count), `LAND_BARON` cities owned
  at once (8), `MUSTER` kinds you can train (6), and `ENGINEER` the highest
  output of one mill (7). No achievement needs a technology.
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
