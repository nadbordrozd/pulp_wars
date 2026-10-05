# Ruleset 7: Martians win by mobility, Ice Folk toned down

Design for epic `pulp_wars-1wy`, bead `pulp_wars-1wy.1`. Status: **the
engine step is implemented** (`pulp_wars-1wy.3`, identity
`pulp-wars-poc-7r37`): M1 to M4 and I1 and I2 with the proposed numbers, as
ruled by the root on 2026-10-04 ([section 13](#13-open-questions): the
Saucer's Tractor Beam at Scouting, the glass-cannon Grunt, Snow cover
× 1.25), and folded into
[RULESET_7_CURRENT.md](RULESET_7_CURRENT.md) (its sections 11, 20.7, 20.10,
and 21.5), which is authoritative; what the implementation made precise is
in [section 15](#15-implementation-notes-pulp_wars-1wy3). The UI step
(`pulp_wars-1wy.5`) is implemented too ([section 11](#11-ui-and-help-text)),
and so is the Normal AI step (`pulp_wars-1wy.4`,
[section 16](#16-normal-ai-notes-pulp_wars-1wy4)). The measurement
(`pulp_wars-1wy.6`) applied the first step of the Martian fallback ladder,
**Grunt HP 8** (identity `pulp-wars-poc-7r39`), and rechecked on a small
sample:
[section 17](#17-measurement-and-the-grunt-at-8-hp-pulp_wars-1wy6). The
Ice Folk numbers were not measured. Sections 3 and 4 describe the rules
before the change.

The document diagnoses both factions with numbers from the engine's own
combat formula, proposes four Martian changes and two Ice Folk changes with
exact rules and numbers, checks them for degenerate loops, and defines how
they are accepted: a coarse Dry Land matrix and a **human-style probe**, a
scripted Martian policy that uses every mobility tool every turn.
[Appendix A](#appendix-a-draft-critique-redraft) records the first draft,
the critique, and what the redraft changed.

## Contents

1. [Sources and the problem](#1-sources-and-the-problem)
2. [Method](#2-method)
3. [Diagnosis: Martians](#3-diagnosis-martians)
4. [Diagnosis: Ice Folk](#4-diagnosis-ice-folk)
5. [Martian proposal](#5-martian-proposal)
6. [Ice Folk proposal](#6-ice-folk-proposal)
7. [Expected outcome](#7-expected-outcome)
8. [Acceptance](#8-acceptance)
9. [Normal AI changes](#9-normal-ai-changes)
10. [Engine impact](#10-engine-impact)
11. [UI and Help text](#11-ui-and-help-text)
12. [Bead breakdown](#12-bead-breakdown)
13. [Open questions](#13-open-questions)
14. [Appendix A. Draft, critique, redraft](#appendix-a-draft-critique-redraft)
15. [Implementation notes (`pulp_wars-1wy.3`)](#15-implementation-notes-pulp_wars-1wy3)
16. [Normal AI notes (`pulp_wars-1wy.4`)](#16-normal-ai-notes-pulp_wars-1wy4)
17. [Measurement and the Grunt at 8 HP (`pulp_wars-1wy.6`)](#17-measurement-and-the-grunt-at-8-hp-pulp_wars-1wy6)

## 1. Sources and the problem

**The user's playtest (2026-10-04, quoted in epic `pulp_wars-1wy`):**

> martians mechanics with tractor beams and stuff and all the ranged units
> are fantastic. great concept. i want to make it work. but as it is they
> are very weak. mothership is such an expensive unit and it doesn't do
> anything. it can move a unit off a city and that could be a great tactical
> play but it's too rare for this to make a difference. grunts are super
> weak to the point they are not a fighting force. they cant kill anything.
> youd need 3 to 1 vs human warriors. flying saucers and beaming down could
> be a great trick but too many limitations. a faction that is physically
> weak but wins through superior manouvrability would be awesome but we're
> not quite there yet. on the other hand ice folks are over powered with all
> the bonuses on snow especially the fast movement. I like it all
> qualitatively but quantitively they are too strong. have a think how to
> balance them better.

**Decided direction.** Martians keep weak bodies and win through superior
manoeuvrability: the Tractor Beam, Beam Down, and the flyers become the
faction's everyday tools, not rare tricks. The Ice Folk keep every
mechanic (Snow, Glide, Blizzard, Chill, Shatter) and lose part of the
quantitative edge on Snow, mainly the fast movement.

**The AI disagrees with the user, and the user wins the argument.** The
Normal AI Martians won 53-57% of decided Dry Land games at `7r25`
([Martian balance report](../validation/RULESET_7_MARTIAN_BALANCE.md)) and
58% at `7r32` (the Grunt ray pistol,
[Martian tuning record](RULESET_7_MARTIANS.md#165-tuning-record)), and
45.8% of their mixed games in a later 24-games-per-pair Normal AI matrix on
`7r27` rules ([Normal AI notes](../architecture/NORMAL_AI.md)); the Ice Folk
won 56% at `7r27`
([Ice Folk balance report](../validation/RULESET_7_ICE_FOLK_BALANCE.md)) and
64.2% in that later matrix. The AI plays both factions differently from a
person: it masses Grunts and chips from two tiles (about six Grunts per
seat-game, 88% of their shots from two tiles; Saucers, Motherships, and the
Tractor Beam are marginal), and it does not drive the Ice Witch's Blizzard
as a fast-moving fortress. This design therefore reasons about **a competent
human who uses every tool every turn** ([sections 3.1](#31-the-human-turn)
and [4.5](#45-the-human-turn)) and uses AI numbers only as a guard against
gross imbalance.

**Standing policy** (bd memory `balance-testing-policy-user-2026-10-02-until`):
coarse balance only, Dry Land maps, small samples, remove gross imbalances
(worse than about 70/30) and blind spots; numeric fine tuning is deferred.
Any change to Normal AI heuristics comes with a modest head-to-head test
(bd memory `ai-policy-tweaks-user-2026-10-02-any`). Engine work that bumps
the identity runs one at a time (bd memory
`engine-identity-bumping-work-runs-one-at-a`).

## 2. Method

- **Engine numbers.** A scratch vitest file (deleted after use) built
  two-seat Dry Land fields with the Martian and Ice Folk test fixtures
  (`martianFieldV7`, `iceFieldV7`) and called
  `calculateCombatPreviewV7` for every exchange on open Grass, on Field
  Defense, in Forest, on Snow, and in a Blizzard, at full HP and full Shield
  unless stated, chaining hits with the HP and Shield left by the previous
  one. Movement reach came from `queryPlayerCommandsV7`.
- **Proposed numbers** use a replica of the
  [damage formula](RULESET_7_CURRENT.md#132-damage) (half-unit Attack and
  Defense, round half up, Shield first, Blizzard halving) checked against 28
  engine values with no mismatch. Every current-rules number below comes
  from the engine except the Skeleton, Zombie, Caveman, and Goblin rows and
  the Witch kill counts, which come from the checked replica; every number
  under a proposed rule comes from the replica.
- **Snow coverage** came from six Normal AI matches (Ice Folk against
  Humans, Undead, Martians, and Dinosaurs; Dry Land 11 x 11 and 14 x 14),
  replayed and measured with `isSnowV7`.
- **AI telemetry** is quoted from the checked balance reports.
- **Reading the tables.** "Hit" is the whole hit, "Shield / HP" what the
  Shield absorbed and the HP lost, "back" the retaliation the attacker takes.
  "To kill" is how many identical fresh attackers kill a fresh target in one
  turn (the Shield does not recharge in between), with the hits in order.

## 3. Diagnosis: Martians

### 3.1 The human turn

What a competent human does with each Martian tool today, on a typical
turn of the mid game (round 12-25) against a Human army:

| Tool             | What it does on that turn                                                                                                                                       | What stops it                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Grunts           | walk 1 tile, shoot 3 from two tiles                                                                                                                             | 3 damage is a quarter of a Fighter: four Grunts (12 Coins) kill one 2-Coin Fighter                                                          |
| Ray Gunner       | full ray 8, then a Cooling turn of 3                                                                                                                            | Move 1; must not move to fire full                                                                                                          |
| Saucer           | either scouts, or (unmoved) beams one unit from a city to a tile next to itself                                                                                 | the beamed unit is **exhausted**: it cannot shoot until next turn, so the Saucer turns a fight one turn late; the Saucer may not have moved |
| Mothership       | if it exists at all (tier 3, 10 Coins, two slots; median first one at round 33 for the AI), pulls one unit at **exactly** two tiles one tile closer, or attacks | the pull is its whole turn; a defender pulled one tile off its center steps back or kills whoever stepped on                                |
| Brain            | Psychic Command (+1) or Mind Control on a wounded unit of 6 HP or less                                                                                          | needs wounded targets that the Grunts' 3-damage shots rarely leave                                                                          |
| Shield Projector | stands next to the line; Shields recharge to 4                                                                                                                  | Move 1, cannot attack after moving                                                                                                          |
| Tripod           | full ray 12 plus Pierce 6 from exactly two tiles                                                                                                                | 9 Coins, tier 3                                                                                                                             |

The army that results is a **Move-1 foot blob** (Grunts, Ray Gunners,
Projectors, Brains) with chip damage, escorted by two flyers that rarely act.
The "invasion force that wins by manoeuvre" moves no faster than a Human
Fighter line: the only fast parts deliver one exhausted unit a turn or pull
one unit a turn late in the game.

### 3.2 Grunt

Cost 3, 10 HP, Shield 2, Attack 1.5, Defense 1.5, Move 1, range 1-2 (a plain
ray pistol). Human peers: Fighter (2 Coins, 12 HP, Attack 2, Defense 2) and
Marksman (3 Coins, 12 HP, Attack 2, Defense 1, range 1-2).

| Target                      | Grunt shot from 2: hit | Grunts to kill | Target hits a Grunt: hit → Shield / HP; back | Such hits to kill Grunt |
| --------------------------- | ---------------------: | -------------- | -------------------------------------------- | ----------------------- |
| Fighter                     |                      3 | 4 (3, 3, 4, 2) | 5 → 2 / 3; 3                                 | 3 (5, 6, 1)             |
| Fighter on Field Defense    |                      2 | 4 (2, 3, 3, 4) | —                                            | —                       |
| Fighter in Forest           |                      2 | 4 (2, 3, 3, 4) | —                                            | —                       |
| Guard                       |                      2 | 6              | 3 → 2 / 1; 3                                 | 3 (3, 4, 5)             |
| Guard on Walls and FD       |                      1 | —              | —                                            | —                       |
| Marksman                    |                      4 | 3 (4, 5, 3)    | 5 → 2 / 3; 3 (the Grunt answers at 2)        | 3 (5, 6, 1)             |
| Raider or Knight            |                      4 | 3              | 9 → 2 / 7; 2 (Charge)                        | 2 (9, 3)                |
| Catapult                    |                      5 | 2 (5, 5)       | —                                            | —                       |
| Skeleton, Caveman, Yeti     |                      3 | 3              | 5 → 2 / 3; 3                                 | 3 (5, 6, 1)             |
| Zombie                      |                      3 | 5              | —                                            | —                       |
| Goblin                      |                      5 | 2 (5, 1)       | 3 → 2 / 1; 3                                 | 3                       |
| Fighter, Psychic Command    |                      6 | —              | —                                            | —                       |
| In a Force Field (Shield 4) |                      — | —              | Fighter 5 → 4 / 1                            | 3 (5, 5, 4)             |

- **It cannot kill.** The user's "3 to 1" is generous: four Grunt shots
  (12 Coins of Grunts) kill one Fighter in a turn; six kill a Guard. A
  Human Marksman at the same 3 Coins deals the Fighter 5.
- **It is not weak as a body.** Three Fighter hits kill it, the Shield
  makes chip damage cheap, and it answers a Marksman from two tiles. The
  faction's frailty is not in the Grunt's body; it is in the Grunt's gun.
- **Why the AI wins with it anyway:** the AI fields about six Grunts per
  seat-game (1,095 Grunts against 155 Ray Gunners in 168 games at `7r32`),
  shoots 88% of the time from two tiles with no retaliation, and lets
  numbers do the work (already at `7r25`, as a melee unit, the Grunt made
  60% of Martian kills). A human who buys three Grunts and a Mothership, as the
  faction's identity invites, finds that none of them kills anything.

### 3.3 Ray Gunner and Cooling

Cost 4, 8 HP, Shield 2, Attack 3, Defense 1, range 1-2, heat ray.

- Full ray 8 on a Fighter, 7 on a Guard, 7 on a Guard on Walls and Field
  Defense with the Disintegrator (5 without); half power 3.
- Two full rays kill a Fighter (8, 4). Two turns of one Ray Gunner that
  stands still: 8 + 3 = 11 against the Marksman's 5 + 5 = 10.
- A Fighter hits it for 6 (2 / 4) and takes 2. **Verdict: the faction's
  real damage, working as designed.** Cooling makes it a one-shot-a-turn
  sniper that must not move, which is exactly why the faction needs other
  units to bring targets to it.

### 3.4 Shields and the Shield Projector

- **Shields** (2 on small units, 3 Projector and Colossus, 4 Mothership; 4
  next to a Projector). A Shield absorbs 2 of a Fighter's 5 and recharges
  every turn: excellent against chip, nothing against focus fire (every
  basic hit is at least 5; no Shield exceeds 4).
- **Projector:** cost 4, 12 HP, Shield 3, Attack 1.5, Defense 2.5. A
  Fighter hits it for 4 (3 / 1) and takes 6; four Fighters kill it. It
  attacks a Fighter for 3 and takes 5. The Force Field absorbed 2,116
  damage in 240 AI seat-games. **Verdict: fine; not part of the complaint.**

### 3.5 Saucer and Beam Down

Cost 4, 8 HP, Shield 2, Attack 1.5, Defense 1, Move 3, flies, Strafe.

- Attack 3 on a Fighter (takes 5 back); with Strafe 6 on a Fighter, 8 on a
  Marksman, 9 on a Catapult. A Fighter hits it for 6 (2 / 4): two Fighters
  kill it (6, 4), a charging Raider kills it in one hit (10).
- **Beam Down's limits**, in the order a player meets them:
  1. the Saucer must not have moved this turn (so it hovers a turn ahead of
     where the unit is needed, in plain sight);
  2. the passenger must stand on or next to an own city center;
  3. the passenger arrives **exhausted**: it cannot shoot, move, or act
     until its owner's next turn;
  4. the destination is next to the Saucer, not a settlement site, not in
     allied territory;
  5. the Saucer has used its primary action.

  Limits 1 and 3 together mean a beamed unit acts two turns after the
  decision, which is why the user calls it a trick with too many
  limitations. The AI uses it as logistics (862 Beam Downs in 138
  seat-games; 2% of Martian city captures came from beamed units).

- **Verdict: the right tool with the wrong brakes.** The brakes were added
  in the original overlay to stop a Saucer and Grunt from out-expanding a
  Raider by one turn from distance 8
  ([Martian overlay section 9.3](RULESET_7_MARTIANS.md#93-saucer)), a
  concern that matters far less than the Martian army being slow.

### 3.6 Tripod and Stride

Cost 9, 12 HP, Shield 2, Attack 4, Defense 1, Move 2, range exactly 2,
walker.

- Full ray 12 on a Fighter (a kill) and Pierce 6 on the unit behind; half
  power 5; full ray 10 on a Guard, 7 on a Guard on Walls and Field Defense.
- A Fighter hits it for 6 (2 / 4) with no retaliation (minimum range 2):
  three Fighters kill it (6, 7, 1); a charging Knight hits it for 10.
- **Stride** (walkers cross Forest, Mountain, and Shallow Water without
  stopping, never get cover) is a real mobility edge that already works.
- **Verdict: strong and fine.** The Tripod made 11% of Martian kills at
  1.9-3.5 kills per loss.

### 3.7 Brain and Mind Control

Cost 5, 8 HP, Shield 2. Mind Control (section 20.8 and 20.9 as implemented
in `7r33`): a wounded hostile unit of 6 HP or less within two tiles, not on a
settlement site, one controlled unit per Brain, two turns of cooldown; the
unit keeps its kind and fights for the Brain's owner until the Brain is lost.

- It was used in only 39% of AI Brain seat-games at `7r25` and in 18 of 50
  in the later matrix: targets at 6 HP or less are scarce when the army's
  main gun deals 3.
- **Verdict: fine as a rule; starved by the Grunt's damage.** Anything that
  makes Grunts and pulls leave wounded units in reach feeds it.

### 3.8 Mothership and the Tractor Beam

Cost 10, two slots, 16 HP, Shield 4, Attack 2.5, Defense 2, Move 2, flies,
tier 3 (Chivalry).

- Attack 6 on a Fighter (its retaliation of 4 is absorbed whole), 8 on a
  Marksman, 5 on a Guard (taking 7: 4 / 3).
- A Fighter hits it for 5 (4 / 1) and takes 5; four Fighters kill it.
- **The Tractor Beam today:** a primary action at Chebyshev distance
  **exactly 2**, pulling **one tile**. On a turn it pulls, it neither
  attacks nor does anything else. A defender pulled off a city center lands
  next to the center and, unless killed at once, steps back or kills the
  unit that stepped on.
- **How rare:** in the AI, a Mothership in 38 of 240 seat-games, the first
  one at median round 33 (most decided games end by round 20-28), a Tractor
  Beam in 37% of the seat-games with one, and 28 defenders pulled off a
  center in 240 games. For a human the cost is the problem: 10 Coins and two
  slots for one pull per turn, late.
- **Verdict: the user is right.** The faction's signature trick sits on its
  rarest unit and costs that unit's whole turn.

### 3.9 Flying

Flyers pass over units, ignore zones of control and terrain stops, cross
water, and never end on a foreign or neutral settlement center. **Verdict:
fine.** Flying is the mobility the faction already has; the proposal gives
the flyers more to do with it rather than more speed.

### 3.10 Why the AI wins and the human does not

The AI wins by the cheapest thing the faction has (Grunt numbers and
two-tile chip), which a human finds unrewarding and which says nothing about
the identity. The human invests in the identity (Saucers, Beam Down, the
Mothership) and finds each tool one step short: the beamed unit is a turn
late, the pull is a turn's whole work at exactly one distance, the
Mothership arrives after the game is decided, and the Grunts cannot finish
what the tools set up. The fix must therefore (a) make the mobility tools
pay off every turn and (b) give the Grunt a gun that can finish targets,
paid for with its body, while (c) watching that the Grunt blob the AI
already wins with does not become a gross imbalance
([section 8.4](#84-tuning-bounds-and-fallback-ladders)).

## 4. Diagnosis: Ice Folk

### 4.1 What Snow gives

Snow is the Ice Folk seat's territory, the 3 x 3 Blizzard around each Ice
Witch, and, with Deep Winter, neutral land within two tiles of an Ice Folk
city center ([section 21.5](RULESET_7_CURRENT.md#215-snow)). On Snow:

1. **Glide** (movement). A step that **leaves** a Snow tile costs a
   half-point instead of a full point, wherever it goes. A Move-1 unit on
   Snow moves two tiles if the first tile it enters is Snow, **including
   the step off the Snow**; a Sled up to four steps. The Sabretooth never
   glides.
2. **Snow cover** (defence). An unfortified Ice Folk defender on Snow has
   cover x 1.5, as in a Forest.
3. **Deep snow** (enemy movement). Another faction's ground unit ends its
   Move on entering Snow (Road edges and Fieldcraft for Raider and Marksman
   roles excepted).
4. **Blizzard** (inside the Witch's 3 x 3 only): a hit from two tiles or
   more on an Ice Folk unit there is halved, rounded up.

### 4.2 How much land is Snow

Six Normal AI matches (Dry Land), Snow tiles as a share of land:

| Match (size, opponent)       | Round 1 | Round 5 | Round 10 | Round 15 | Round 20 | Round 25 |
| ---------------------------- | ------: | ------: | -------: | -------: | -------: | -------: |
| 11 x 11, Humans              |      7% |      7% |       7% |       7% |        — |        — |
| 11 x 11, Undead              |      7% |      7% |      15% |      15% |       7% |        — |
| 11 x 11, Martians (Deep Win) |      7% |      7% |      15% |      22% |       7% |        — |
| 14 x 14, Humans (Deep Win)   |      5% |      5% |       9% |       9% |       9% |      23% |
| 14 x 14, Martians            |      5% |      5% |      18% |      18% |      18% |        — |
| 14 x 14, Dinosaurs           |      5% |      5% |       5% |        — |        — |        — |

Snow is the capital's 3 x 3 for the first five to ten rounds and rarely
more than a fifth of the land. The AI telemetry agrees that the defensive
parts are small: Snow cover prevented 582 damage and the Blizzard 96 in 200
seat-games (about 3 HP a game), deep snow stopped 127 enemy Moves; Glide
was used in 4,937 Moves. **The Snow is small; what it does to movement is
not.**

### 4.3 Glide: reach (engine)

| Mover                             | Destinations offered | Farthest tile |
| --------------------------------- | -------------------: | ------------: |
| Yeti on an inner Snow tile        |                   24 |             2 |
| Yeti in the open                  |                    8 |             1 |
| Sled on Snow                      |                   48 |             3 |
| Sled in the open                  |                   24 |             2 |
| Ice Witch (in her own Blizzard)   |                   24 |             2 |
| Yeti next to a Witch, in the open |                   18 |             2 |
| Grunt (for comparison)            |                    8 |             1 |

Two consequences, both measured or shown by the engine:

- **The village run.** Every unit trained on an Ice Folk center leaves
  home at double speed: the capital's Yeti reaches villages a turn earlier
  than a Fighter. This was the measured engine of the original 69% (Glide
  off as a diagnostic: 57%; Ice Folk ahead in cities at round 15 won 65 of
  66 games) and was paid for by the Yeti's body (9 HP, Defense 1.5), not
  removed.
- **The Blizzard ball.** The Witch's Blizzard moves with her, and every Ice
  Folk unit inside it glides, so the Witch and her escort advance **two
  tiles a turn**, enemy ground units stop at its edge, and ranged hits on
  them are halved. This is what a human does with the Ice Folk and what the
  AI does not; it is the "fast movement" of the complaint.

### 4.4 Exchanges on and off Snow (engine)

| Exchange (full HP)                | Open      | Snow     | Snow, Blizzard |
| --------------------------------- | --------- | -------- | -------------- |
| Fighter attacks a Yeti: hit; back | 5; 3      | 4; 4     | 4; 4           |
| Fighters to kill a Yeti           | 2 (5, 4)  | 2 (4, 5) | 2              |
| Marksman from 2 on a Yeti         | 5         | 4        | 2              |
| Catapult on a Yeti                | 9 (kills) | 9        | 5              |
| Ray Gunner full ray on a Yeti     | 9         | 8        | 4              |
| Grunt from 2 on a Yeti            | 3         | 3        | 2              |
| Fighter attacks a Mammoth: hit    | 5         | 4        | 4              |
| Fighters to kill a Mammoth        | 4         | 5        | 5              |
| Fighters to kill the Witch        | 2 (6, 6)  | —        | 3 (5, 6, 1)    |

| Ice Folk attack (full HP, open)               |         Hit | Back |
| --------------------------------------------- | ----------: | ---: |
| Yeti on a Fighter                             |           5 |    5 |
| Second Yeti on a Chilled Fighter at 7 HP      | shatters it | none |
| Mammoth on a Fighter (plus Sweep 2 each side) |           6 |    4 |
| Sled with Charge on a Fighter                 |           8 |    4 |
| Snow Hunter from 2 on a Fighter (Chilled)     |       5 (6) |    0 |
| Boulder Yeti, Planted, from 2                 |           8 |    0 |
| Sabretooth on a Fighter                       |           8 |    4 |

- Snow cover saves a Yeti about one point a hit but never a hit to kill it
  against Fighters (2 either way). It matters for the **Mammoth** (five
  Fighter hits instead of four) and the **Witch** (three instead of two),
  which is the "Witch is almost never killed" blind spot of the Ice Folk
  report (killed in 15 of 79 Witch seat-games).
- The Blizzard is the strongest defensive number on the board against
  ranged armies (a Catapult 9 becomes 5, a Ray Gunner 9 becomes 4), and the
  Martians are the ranged faction. It is not part of the complaint and is
  left alone; the proposal gives the Martians a way out of it instead
  (pull the target out of the Blizzard, [section 5.7](#57-per-unit-battle-analysis-after-the-change)).

### 4.5 The human turn

A competent Ice Folk human: rounds 1-10, train Yetis and Sleds and glide
them out of every Snow tile two tiles at a time to the villages; from the
Witch on (Administration), move the Witch and her army as one 3 x 3 Snow
carpet two tiles a turn, Cold Snap every enemy within two, and shatter the
frosted ones with Yetis that take no blow back. Every part of this is the
qualitative identity the user likes; the **speed** of it (the run out of
home and the two-tile Blizzard ball) is the quantitative excess, and the
Snow cover on the Witch and the Mammoth is the next.

## 5. Martian proposal

Four changes, chosen so that mobility is the way Martians win: the Saucer
becomes the faction's everyday mobility unit (pull and deliver), Beam Down
loses the brakes that made it a turn late, the Mothership becomes an
affordable carrier with a free heavy pull, and the Grunt gets a gun that
finishes what the pulls set up, paid for with a weaker body.

| #   | Change                       | One sentence for the player                                                                                                        |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Beam Down, freed             | A Saucer brings one of your units from a city, or from up to 2 tiles away, next to itself, even after flying; it can still attack. |
| M2  | Tractor Beam on the Saucer   | A Saucer can pull a unit two tiles away one tile toward itself.                                                                    |
| M3  | Mothership, the carrier      | The Mothership costs 8, can Beam Down, and its heavy Tractor Beam (2-3 tiles, up to 2 tiles of pull) is free once a turn.          |
| M4  | Grunt: real gun, weaker body | A Grunt has Attack 2 and 9 HP.                                                                                                     |

### 5.1 M1: Beam Down, freed

`BEAM_DOWN { kind, unitId, passengerUnitId, to }` keeps its command shape
and its order in the command list. It is a primary action of every role
with the `BEAM_DOWN` ability: the Saucer and, by M3, the Mothership (the
**carrier**). The legality table of
[section 20.7](RULESET_7_CURRENT.md#207-beam-down) changes as follows:

| #   | Today                                                                                                                         | Proposed                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | the carrier has not used a primary action and has not landed this turn                                                        | unchanged                                                                                                                                                                                                                                                     |
| 5   | the carrier has not moved this turn (`MOVED`)                                                                                 | **removed**: the carrier may have moved (a sluggish carrier that moved still cannot, by the sluggish rule); the rejection reason `MOVED` is retired                                                                                                           |
| 6   | the passenger is another own land-form unit, one slot, not `FLY`, standing on or next to the center of a city the actor owns  | the passenger is another own land-form unit, one slot, not `FLY`, that has not been beamed this turn, and **either** stands on or next to the center of a city the actor owns **or** stands within Chebyshev 2 of the carrier (`BEAM_DOWN_PICKUP_RANGE_V7` 2) |
| 7   | `to` is one of the eight tiles around the carrier, enterable, empty, no chest, not a settlement site, not in allied territory | unchanged (and never a Rift or a mound, as today)                                                                                                                                                                                                             |

**Result** (replaces "the exhausted activation"): the passenger stands on
`to` and **counts as having moved this turn**: `activation.moved` becomes
true (`movedPathLength` unchanged), every other activation flag is kept,
and it is marked beamed for the turn. So a passenger that has not yet
acted may still use any primary action a unit may use after moving: a
Grunt shoots at full Attack, a ray unit fires at **half power**, a Brain
may use Mind Control or Psychic Command, a Shield Projector cannot attack
(it never attacks after moving). It cannot Move again, Recover, or Capture this turn
(`captureEligible` stays false, as today). A passenger that had already
acted is only relocated. Everything else is unchanged: HP, Shield, kills,
home city, Cooling, statuses, Field Defense destroyed on a hostile `to`,
the events, and the reveal.

- **Once per turn per passenger.** A unit beamed this turn is not a
  passenger again until its owner's next turn (no chain teleports).
- **Pick-up and extraction.** A Grunt that has fired may be picked up by a
  carrier within two tiles and set down next to it: the faction's
  hit-and-run is done by its flyers, one carrier action per unit.
- **Why "moved" and not "fresh":** a fresh passenger would fire a heat ray
  at full power from nowhere (a beamed Tripod: 12 and Pierce 6; a Ray
  Gunner: 8), an alpha strike no opponent can see coming. "Moved" keeps the
  Grunt's full shot and half-power rays, which is exactly the weight of an
  ordinary Move-and-shoot.

### 5.2 M2: the Tractor Beam on the Saucer

The Saucer gains `TRACTOR_BEAM` with the rule of
[section 20.10](RULESET_7_CURRENT.md#2010-tractor-beam) unchanged: a primary
action; the target is any visible own or hostile unit (never allied, never
an Egg, a `JUGGERNAUT`-role unit, or a two-slot unit) at Chebyshev
distance **exactly 2**; it is pulled **one tile** toward the Saucer under
the Push conditions; it keeps its HP, Shield, statuses, and activation; a
defender pulled off a center leaves it empty. The Saucer's primary actions
become Attack, Beam Down, and Tractor Beam (one per turn).

So the trick the user likes is available from Scouting (tier 1), on the
4-Coin unit every Martian army already builds, and every Saucer offers a
choice each turn: pull a target into the guns, deliver a unit, or strafe.

### 5.3 M3: the Mothership, the carrier

| Parameter     | Today                | Proposed                                                                                                             |
| ------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Cost          | 10                   | **8**                                                                                                                |
| Slots         | 2                    | 2 (unchanged)                                                                                                        |
| Abilities     | Attack, Tractor Beam | Attack, **Beam Down** (the M1 rule, the Mothership as carrier), **Heavy Tractor Beam**                               |
| Tractor reach | exactly 2            | **2 or 3** (`HEAVY_TRACTOR_RANGE_V7` 3, minimum 2)                                                                   |
| Pull          | 1 tile               | **up to 2 tiles** (`HEAVY_TRACTOR_PULL_V7` 2), stopping next to the Mothership                                       |
| Action cost   | its primary action   | **free, once per turn**: not a primary action; the Mothership may still Move (if it has not) and Attack or Beam Down |

**Heavy Tractor Beam, exactly.** `TRACTOR_BEAM { kind, unitId, targetUnitId }`
from a Mothership:

- **Actor:** own Mothership in land form that has not landed this turn and
  has not used its Tractor Beam this turn. It may have moved and may have
  used its primary action. A sluggish Mothership that moved cannot use it
  (the sluggish rule lists the Tractor Beam already).
- **Target:** as for the Saucer, at Chebyshev distance 2 or 3.
- **Pull:** repeat at most twice: the next tile is the target's tile plus
  `(sign(dx), sign(dy))` of the offset from the target to the Mothership;
  the step is taken only if that tile passes the Push conditions of
  [section 13.4](RULESET_7_CURRENT.md#134-after-combat) for the target
  (empty, not a settlement site, the same land or water kind, enterable by
  the target as the current rule reads it, not allied territory to the
  target, no chest, no mound); the pull stops when the target is next to
  the Mothership or a step fails. At least one step must succeed
  (otherwise `TRACTOR_BEAM_NOT_LEGAL { reason: "BLOCKED" }`).
- **Result:** as today (keeps HP, Shield, statuses, activation;
  `captureEligible` false; no Field Defense or treasure change; an own
  target reveals its sight), plus the Mothership's per-turn Tractor flag.
  `UNIT_PULLED` carries the final tile in `to` and the tiles crossed in a
  new `path` (one or two tiles).

**Why the carrier.** At 8 Coins the Mothership costs one less than a Knight
and two less than today; it carries the same Beam Down as a Saucer (so a
late army has a 16-HP, Shield-4 carrier instead of an 8-HP one), and its
pull no longer competes with everything else it does. A Mothership turn
becomes: fly 2, pull a defender off its Walls from three tiles so it lands
two tiles away from its center (a Move-1 unit cannot walk back in one turn),
then attack it or beam a Grunt next to the city.

### 5.4 M4: Grunt, a real gun and a weaker body

| Parameter                                          | Today     | Proposed      |
| -------------------------------------------------- | --------- | ------------- |
| Attack                                             | 1.5 (`3`) | **2** (`4`)   |
| HP                                                 | 10        | **9**         |
| Cost                                               | 3         | 3 (unchanged) |
| Shield, Defense 1.5, Move 1, range 1-2, plain shot | —         | unchanged     |

The Grunt becomes the Martian **Marksman-priced line unit**: a Human
Marksman (3 Coins) deals a Fighter 5 from two tiles and dies to two Fighter
hits (6, 7); the proposed Grunt deals 5 and dies to two Fighter hits (5,
6), with a Shield that recharges every turn instead of the Marksman's 3
extra HP. Promoted HP becomes 14 (the ordinary +5). The Thrall is retired,
so nothing else shares the statline.

### 5.5 What does not change

Shields and their maxima, the Force Field and Force Fields, heat rays and
Cooling, Pierce, the Disintegrator, Stride, Flying, crossing water, the Ray
Gunner, the Shield Projector, the Brain and Mind Control, the Tripod, the
Colossus, Strafe, the Saucer's statline and cost, and every other faction.
No change touches a match without a Martian seat.

### 5.6 Degenerate loops

| Risk                                                | Check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Verdict                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Infinite kiting** (shoot, get beamed out, repeat) | Each cycle costs a carrier's whole primary action per Grunt; the carrier must end within two tiles of the Grunt, so within about four of the target, in reach of every Raider-role unit (Move 2 plus Charge kills a Saucer: 10 on 8 + 2), every Marksman-role unit, Catapults, and Knights; every faction has a Move-2 unit and a ranged unit at tier 1. The kiter gives ground every turn and protects nothing it leaves. Against a pure Move-1 melee army a Grunt-and-Saucer pair (7 Coins) can kite one target for 5 a turn: legitimate hit-and-run, not a stall. | acceptable; measured as a watch band (round caps and extractions, section 8.3)            |
| **Chain teleports**                                 | A passenger is beamed at most once per turn (M1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | closed                                                                                    |
| **Alpha strike from nowhere**                       | A beamed unit counts as moved: heat rays at half power (a Tripod 5, a Ray Gunner 3); a Grunt 5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | closed                                                                                    |
| **Untouchable units**                               | No unit both acts and leaves reach in one turn by itself: a Mothership can pull and then fly (if it has not moved), but it ends within reach of the pulled unit's friends and has 16 HP and Shield 4 against everything; a beamed-out Grunt stands next to its carrier, which is in reach.                                                                                                                                                                                                                                                                           | closed                                                                                    |
| **Permanent city denial**                           | A pull empties a center for one turn; capture still needs a unit that began its turn on the center, so the defender's side always gets a turn to kill the unit that stepped on (a Grunt dies to two Fighter hits, 5 then 6). Pulling each newly trained unit off a center does not stop training and piles the city's units around the Saucer, which dies to two hits. With the heavy pull the defender lands two tiles out: the city falls next turn unless something else kills the stepper. That is a siege tool, not a lock.                                     | acceptable; watch band "city fell within two rounds of a pull off its center" at most 50% |
| **Pull ping-pong**                                  | Pulling the same unit back and forth spends two actions and changes nothing on its owner's turn (it keeps its activation).                                                                                                                                                                                                                                                                                                                                                                                                                                           | harmless                                                                                  |
| **Early rush with tier-1 pulls**                    | A Saucer that pulls a lone center defender ends two tiles from the center with the pulled unit next to it: a Fighter hits it for 6 (2 / 4) and any second hit kills it. Trading a 4-Coin Saucer for a one-turn opening is a real price.                                                                                                                                                                                                                                                                                                                              | acceptable; watch band                                                                    |

### 5.7 Per-unit battle analysis after the change

**Grunt (M4)**, replica, full HP, open Grass, from two tiles:

| Target                      | Shot today → after | Grunts to kill today → after   | Its hit on the Grunt → hits to kill it today → after |
| --------------------------- | -----------------: | ------------------------------ | ---------------------------------------------------- |
| Fighter                     |              3 → 5 | 4 → **3** (5, 6, 1)            | 5 (2 / 3) → 3 → **2** (5, 6)                         |
| Fighter on Field Defense    |              2 → 4 | 4 → 3 (4, 5, 3)                | —                                                    |
| Fighter in Forest           |              2 → 4 | 4 → 3                          | —                                                    |
| Guard                       |              2 → 4 | 6 → 4 (4, 4, 5, 4)             | 3 (2 / 1) → 3 → 3 (3, 4, 4)                          |
| Marksman, Raider            |              4 → 6 | 3 → **2** (6, 6)               | Marksman 5 → 3 → 2; Raider (Charge) 9 → 2 → 2        |
| Knight                      |              4 → 6 | 3 → 2 (6, 4)                   | 9 → 2 → 2                                            |
| Catapult                    |              5 → 7 | 2 → 2 (7, 3)                   | —                                                    |
| Skeleton, Caveman, Yeti     |              3 → 5 | 3 → **2** (5, 5) / Yeti (5, 4) | 5 → 3 → 2 (5, 6)                                     |
| Zombie, Mammoth             |              3 → 5 | 5-6 → 4                        | —                                                    |
| Goblin                      |              5 → 6 | 2 → **1**                      | 3 → 3 → 3                                            |
| Fighter, Psychic Command    |              6 → 8 | —                              | —                                                    |
| In a Force Field (Shield 4) |                  — | —                              | Fighter: 3 (5, 5, 4) → 3 (5, 5, 3)                   |

- **Against the Fighter** the Grunt is now what the user asked for: three
  shots kill a Fighter in a turn, two kill every 10-12 HP Attack-2 unit
  with Defense 1-2 except the Fighter, and a Goblin dies to one. In a
  stand-up fight it is frailer: two Fighter hits kill it (three today).
- **Per Coin**, three Grunts (9 Coins) kill a 2-Coin Fighter a turn without
  retaliation, and two Fighters (4 Coins) kill a Grunt: still not a brawler,
  still a ranged line that wants a screen, but a line that kills.

**Combinations the human plays every turn** (replica):

| Set-up                                                        | Result                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Saucer pulls a Fighter one tile; Ray Gunner full; Grunt       | 8, then 4 on 4 HP: dead, no retaliation (works with today's Grunt too)                       |
| Saucer pulls a Fighter; two Grunts and a third                | 5, 6, 1: dead                                                                                |
| Mothership pulls a Fighter, attacks it (free pull), one Grunt | 6 (the Fighter's 4 back is absorbed), then 6 on 6 HP: dead                                   |
| Mothership pulls a Guard off Walls and Field Defense          | its Ray Gunner hit goes 5 → 7, a Grunt's 2 → 4: Ray Gunner then two Grunts (7, 5, 5) kill it |
| Saucer strafes a Marksman, one Grunt finishes                 | 8, then 4 on 4 HP: dead                                                                      |
| Saucer pulls a Yeti out of a Witch's Blizzard (Snow, x 1.25)  | the Grunt's shot goes 3 → 5; the Ray Gunner's 4 → 9 (a kill)                                 |
| Grunt fires, then a Saucer within 2 picks it up               | the Grunt ends next to the Saucer, up to three tiles from where it fired                     |

**Saucer (M1, M2).** Statline unchanged. Each turn it chooses: Strafe (6 on
a Fighter, 8 on a Marksman), pull (sets up the table above), deliver a city
unit or pick up a fired one. It is still killed by two Fighter hits or one
charging Raider, so it hovers behind the line and acts at two tiles.

**Mothership (M3).** Statline unchanged but cost 8. Fighters still need
four hits (5, 5, 6, 4). Each turn it can pull (free), then attack (6 on a
Fighter, 8 on a Marksman) or beam. It is the faction's late siege engine:
see the city row of [section 5.6](#56-degenerate-loops).

**Unchanged units** (Ray Gunner, Projector, Brain, Tripod, Colossus) gain
only through combinations: more wounded targets for Mind Control, more
targets pulled into full-power rays.

### 5.8 The human turn after

Mid game against a Human army holding a city with a Fighter on Field
Defense and a Guard behind it: a Saucer flies in and pulls the Fighter off
its Field Defense into the open; three Grunts that walked up shoot it (5,
6, 1) or a Ray Gunner and a Grunt finish it (8, 4); a second Saucer beams a
fresh Grunt from the capital to two tiles from the Guard, and the Grunt
shoots on arrival (4); a third Saucer picks up the Grunt that stands next to
the enemy Catapult's reach and sets it down out of it. Next turn the
Mothership pulls the Guard two tiles off the center and a Grunt steps on.
Every flyer did something every turn, and the Grunts finished what the
flyers set up: **mobility is the win condition.**

## 6. Ice Folk proposal

Two changes, both on Snow, aimed at speed first.

| #   | Change                    | One sentence for the player                                                             |
| --- | ------------------------- | --------------------------------------------------------------------------------------- |
| I1  | Glide from Snow onto Snow | Ice Folk units move at half cost only from Snow onto Snow; stepping off is a full step. |
| I2  | Lighter Snow cover        | Snow gives Ice Folk units cover x 1.25 (a Forest or Mountain still gives x 1.5).        |

### 6.1 I1: Glide from Snow onto Snow

Replaces rule 1 of [section 21.5](RULESET_7_CURRENT.md#215-snow):

> **Glide.** For a land-form Ice Folk unit whose role glides (every role
> but the Sabretooth), a step **from a Snow tile onto a Snow tile** costs
> one half-point instead of two; every other step costs what it costs
> today (two, or one from a usable Road node). Snow and a Road node do not
> add up. Snow is read once per `MOVE`, from the state before the command,
> for both ends of every step.

Reach under I1 (half-point arithmetic; Move-1 budget 2, Move-2 budget 4):

| Mover                                        | Today                 | I1                                                          |
| -------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| Yeti trained on a center, leaving home       | 2 tiles (village run) | **1 tile** (the center to the edge costs 1, off the Snow 2) |
| Yeti inside its own territory or Deep Winter | 2 tiles               | 2 tiles (interior lines kept)                               |
| Sled leaving home                            | 3 tiles               | **2 tiles** (like a Raider)                                 |
| Sled inside Snow                             | up to 4 steps         | up to 4 steps                                               |
| Witch and her escort (the Blizzard ball)     | **2 tiles a turn**    | **1 tile a turn** (only her 3 x 3 was Snow before the Move) |

- **The village run** loses its edge: outside its Snow every Ice Folk unit
  moves like its Human peer, which is the "Glide off" diagnostic of the Ice
  Folk report applied only where it mattered (69% to 57% then).
- **The Blizzard ball** moves at the speed of the Witch: one tile a turn.
  Inside the ball, units still shuffle two steps.
- **At home** the faction keeps fast interior lines: a Yeti crosses its
  territory or a Deep Winter field at double speed, which is the defensive,
  "things from the peaks" feel the user likes.
- The public movement query reads both ends from the view's `snow` flags:
  hidden Snow can only make a step cheaper, and a step onto an unexplored
  tile ends the Move anyway, so every offered `MOVE` stays accepted.

### 6.2 I2: lighter Snow cover

Replaces rule 2 of section 21.5: an unfortified Ice Folk defender on Snow
has cover **x 1.25** (`SNOW_COVER_V7` `5/4`); a snowy Forest or Mountain
gives the terrain's x 1.5 (never added). Everything about who gets Snow
cover (no fortification of its own, Acid ignores it, Wail reads it) stays.

| Exchange (replica)                | x 1.5 today | x 1.25       | Open      |
| --------------------------------- | ----------- | ------------ | --------- |
| Fighter on a Yeti: hit; back      | 4; 4        | **5; 3**     | 5; 3      |
| Fighters to kill the Witch        | 3 (5, 6, 1) | **2 (6, 6)** | 2         |
| Fighters to kill a Mammoth        | 5           | **4**        | 4         |
| Fighter on a Snow Hunter / Sled   | 5           | 6            | 6         |
| Knight on a Yeti                  | 8 (lives)   | 8 (lives)    | 9 (kills) |
| Marksman from 2 in the Blizzard   | 2           | 3            | 5         |
| Grunt (M4) from 2 in the Blizzard | 2           | 3            | 5         |
| Ray Gunner full in the Blizzard   | 4           | 4            | 9         |

On the rounding of the formula x 1.25 is close to no cover for the small
units and still keeps the Mammoth and a Yeti against a Knight a point
alive: **Snow stays home, but no longer a Forest under every Ice Folk
unit.** It also closes most of the Witch blind spot: two ordinary hits kill
her on her own Snow.

### 6.3 What does not change

Deep snow, the Blizzard and its halving, Cold Snap, Chill, sluggishness,
Shatter and Brittle, Deep Winter, Mountain-born and Rockfall, Bolas and Cold
Blood, Sweep and Trample, Boulders and Planted, Prowl, the Cold Aura, every
statline and cost (the Yeti keeps 9 HP and Defense 1.5), and every other
faction. No change touches a match without an Ice Folk seat.

### 6.4 Per-unit battle analysis after the change

| Unit         | I1 (movement)                                      | I2 (cover)                                                     | Net                                                          |
| ------------ | -------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| Yeti         | leaves home at Fighter speed                       | takes 5 not 4 from a Fighter, deals back 3 not 4; still 2 hits | the cheap body runs and trades like a Fighter outside home   |
| Sled         | leaves home at Raider speed; Bolas range unchanged | 6 not 5 from a Fighter; still 2 hits                           | the Bolas-then-Shatter combo is untouched                    |
| Snow Hunter  | Move 1 like the Yeti                               | 6 not 5 from a Fighter                                         | unchanged as a shooter                                       |
| Mammoth      | as the Yeti                                        | four Fighter hits, not five                                    | still the tank (20 HP, Sweep)                                |
| Ice Witch    | the Blizzard ball moves one tile a turn            | two Fighter hits kill her, not three                           | the main target of the change; Blizzard and Cold Snap intact |
| Boulder Yeti | Move 2 like the Sled                               | small                                                          | unchanged as artillery                                       |
| Sabretooth   | never glided: unchanged                            | 6 not 5 from a Fighter                                         | unchanged                                                    |
| Frost Giant  | as the Yeti                                        | small                                                          | unchanged                                                    |

The Ice Folk human turn after: the village run is an ordinary run; the
Witch's army advances at one tile a turn and must be met where the enemy
stands rather than overrun; the Witch can be killed by two hits; at home,
Glide, Snow, and deep snow still make the territory a fortress; Chill,
Shatter, and the Blizzard's ranged halving still decide fights.

### 6.5 Naval branch compatibility

The [naval branch](RULESET_7_NAVAL_BRANCH.md) (beads `5ti.*`, not yet
implemented) gives the Ice Folk Freeze, Slide, Black Ice, Icebound, and
Glacier. With I1 and I2:

- **Slide is unaffected:** it is free movement along ice, gated by the same
  role mechanic `glides` (the Sabretooth neither glides nor slides).
- **Entering ice from Snow** costs a full step (ice is never Snow, so I1
  gives no discount); the naval spec's parenthetical "or, by Glide, from
  Snow" in [section 8.6](RULESET_7_NAVAL_BRANCH.md#86-slide) becomes moot.
  Its reach examples still hold: a Yeti enters the ice for a full step and
  slides free; a Sled still has a full step left to land.
- **Glacier's "Snow cover on ice"** uses the Snow cover value, so x 1.25.
  The naval spec's Glacier numbers must be re-run by its engine bead.
- The two engine steps touch the same movement helper. Whichever lands
  second reads the other's rule; the engine bead of this design should land
  before naval step II (`5ti` Ice Folk), so that step builds on the new
  Glide.

## 7. Expected outcome

- **Human play, Martians:** every Saucer acts every turn (pull, deliver, or
  extract), a beamed unit fights the turn it lands, the Mothership is an
  affordable tier-3 carrier with a free pull, and Grunts finish targets
  (three to a Fighter, two to most other line units). The faction is still
  frail: two hits kill a Grunt or a Saucer.
- **Human play, Ice Folk:** the same tools, slower outside home; the Witch
  is mortal; Shatter and the Blizzard unchanged.
- **AI play (coarse guess, to be measured):** Martians up by 5-10 points
  from M4 alone (the AI's Grunt blob gains damage and loses a hit of
  survival), more once the AI uses M1-M3; Ice Folk down by 5-10 points (the
  village run was worth about 12 points before the Yeti nerf). Both should
  land in 45-60%; the fallback ladders of
  [section 8.4](#84-tuning-bounds-and-fallback-ladders) handle a miss.

## 8. Acceptance

### 8.1 Coarse Dry Land matrix

`npm run balance:ruleset7-undead` with the Martian and Ice Folk pairings
against every other faction (Human, Undead, Goblin, Dinosaur, Dwarf, and
each other), Dry Land 11 x 11 and 14 x 14, 10 seeds per seat order (about
40 games per pairing), Normal AI on both sides with the AI of
[section 9](#9-normal-ai-changes), round cap 150:

- Martians and Ice Folk each win **40-60%** of their mixed decided games;
- no pairing beyond 70/30 (the standing policy);
- no round caps above the reference pairings' rate;
- no errors, stalls, or rejections.

### 8.2 The human-style probe

A headless-only policy, `MARTIAN_MOBILITY_PROBE` (never offered in the
browser): the Normal AI with these overrides, in this order, every Martian
turn:

1. **Pull.** Each Saucer and Mothership with a Tractor Beam available makes
   the best pull of: (a) a hostile unit pulled where own units that can
   still attack this turn deal at least its Shield plus HP (previewed);
   (b) a defender off a hostile center next to an own capture-capable unit
   that can step on; (c) an own wounded unit out of visible lethal reach.
2. **Attack**, focusing pulled targets first (the Normal attack scoring).
3. **Extract.** Each carrier that has not acted picks up an own unit that
   has attacked and stands in visible lethal reach, onto the safest legal
   tile.
4. **Deliver.** Each remaining carrier beams a city unit (or one within two)
   to a tile from which it can attack a hostile unit this turn, else to the
   tile that gains the most route steps.
5. **Production:** at least one Saucer per three front units; a Mothership
   as soon as it is offered.

Measured against the Normal AI of every other faction (Dry Land 11 and 14,
10 seeds per seat order) **before** the rules change (the probe on the
rules before `1wy.3`, using whatever is legal: the evidence for the user's
experience) and
**after**. Acceptance after the change:

- the probe wins **at least 50%** of its mixed decided games and at least
  40% against each faction;
- the probe does not do worse than the Normal Martian AI on the same seeds
  by more than 5 points (if it does, the tools are still a trap);
- usage per probe seat-game is reported: Tractor Beams per Saucer-turn,
  Beam Downs (city, pick-up, extraction), passengers that attacked on
  arrival, kills of pulled units.

### 8.3 Watch bands

- City fell within two rounds of a defender pulled off its center: at most
  50% (`7r25`: 14%).
- Extractions per probe seat-game, and games reaching the round cap with a
  probe seat: no increase over the Normal Martian runs (a kiting stall
  would show here).
- Ice Witch killed in at least half of the Witch seat-games per opposing
  faction (`7r27`: 15 of 79).
- Glide Moves per Ice Folk seat-game drop; Ice Folk cities at round 15 no
  longer ahead of the opponent's in more than 60% of games.

### 8.4 Tuning bounds and fallback ladders

Inside these bounds the balance bead may move numbers after measuring (one
further identity bump, as earlier balance beads did); outside them it
reports to the root.

| Parameter          | Proposed | Bounds    |
| ------------------ | -------- | --------- |
| Grunt Attack       | 2        | 1.5-2     |
| Grunt HP           | 9        | 8-10      |
| Mothership cost    | 8        | 8-10      |
| Heavy Tractor pull | 2        | 1-2       |
| Snow cover         | x 1.25   | x 1-x 1.5 |
| M1, M2, I1 rules   | fixed    | —         |

- **Martians above 60%:** first Grunt HP 8; then Mothership cost 9; then
  heavy pull 1. Grunt Attack back to 1.5 only as the last step, and then
  the root asks the user (it reopens the "Grunts cannot kill" complaint).
- **Martians below 40%** (or the probe below its bar): Mothership one slot;
  then the root (no Grunt cost cut: Attack 1.5 at 2 Coins measured 64-82%).
- **Ice Folk above 60%:** Snow cover x 1; then the root (the Yeti is not
  touched again without the user).
- **Ice Folk below 40%:** Snow cover back to x 1.5; then Yeti HP 10.

## 9. Normal AI changes

Bead `1wy.4` (head-to-head per the user's AI policy: same seeds, mirrored
seats, a few dozen decided games, new policy against the old one on the new
rules):

- **Martian Tractor Beam on Saucers:** the Mothership's pull scoring
  ([Normal AI notes](../architecture/NORMAL_AI.md#martian-play-pulp_wars-t6s3))
  applied to every Saucer, plus the probe's "pull into a kill" candidate;
  the Mothership's heavy pull is scored before its attacks, every turn.
- **Beam Down:** after moving; a passenger that can attack on arrival is
  scored with that attack; extraction of a fired unit in visible lethal
  reach; the Mothership as a carrier. The "unmoved Saucer makes no routine
  Move" rule goes (moot).
- **Production:** Saucer value up (one per three front units instead of the
  second-Saucer penalty below six); Mothership at 8 Coins; the Grunt's
  threatened-city bias rechecked for Attack 2 and 9 HP.
- **Against Martians (every seat in such a match):** a city within five
  tiles of a visible Saucer keeps a second defender (pull reach: Move 3
  plus range 2); Saucers are high-value targets; the danger estimate counts
  a carrier as able to put a Grunt shot (5) on any tile within its Move
  plus three.
- **Ice Folk:** no new rule to learn. Check that staging and the Witch's
  escort logic read reach from the movement query (they should), and
  re-run the Ice Folk AI tests.

## 10. Engine impact

Bead `1wy.3`, **one identity bump** (the next free `pulp-wars-poc-7rN` at its
slot in the engine queue; prior identity appended, rejected in setups,
saves, and replays, the obsolete autosave key deleted, the release corpus
refreshed with a reviewed diff).

- **Registry:** Saucer abilities gain `TRACTOR_BEAM`; Mothership gains
  `BEAM_DOWN`, cost 8; Grunt `attack2` 4, `maxHp` 9; constants
  `BEAM_DOWN_PICKUP_RANGE_V7` 2, `HEAVY_TRACTOR_RANGE_V7` 3,
  `HEAVY_TRACTOR_PULL_V7` 2; Snow cover `5/4`.
- **State:** one per-turn fact for "beamed this turn" (passenger) and one
  for "Tractor Beam used this turn" (Mothership); the engine bead chooses
  the shape (new activation flags are the obvious one), hashed, saved,
  replayed, and parsed.
- **Rules:** `BEAM_DOWN` legality and result (section 5.1; `MOVED` reason
  retired); `TRACTOR_BEAM` actor rule by role (the Saucer's is primary,
  the Mothership's free and once a turn), range and multi-step destination
  (`UNIT_PULLED.path`); Glide step cost (section 6.1); Snow cover value.
- **Queries:** `queryPlayerCommandsV7` offers the new commands (a
  Mothership's pull after its Move and after its primary action);
  `previewBeamDownV7` lists pick-up passengers;
  `previewTractorBeamV7` returns the final tile and path;
  `queryThreatenedTilesV7` unchanged (Beam Down threat stays an AI
  estimate); movement reach for the Ice Folk from both Snow ends.
- **Docs:** RULESET_7_CURRENT sections 11, 12, 20, 21, the revision history,
  and the Martian and Ice Folk overlays' tuning records; the naval spec's
  section 8.6 parenthetical (section 6.5 above).
- **Tests:** each rule's legality and result; the pull's two-step path and
  every stop condition; no second beam of a passenger; a beamed ray unit at
  half power; Glide both-ends cost, the village run and the Blizzard ball
  at one tile; cover values; parity (no change without a Martian or Ice
  Folk seat: the reference pairings end in the same hashes).

## 11. UI and Help text

Bead `1wy.5`. No new art: the Saucer reuses the Mothership's tractor cone
(scaled), and Beam Down keeps its effect. No coordinates in any text;
minimal panels, as the `pulp_wars-b5f.8` rule requires.

- **Saucer:** a Tractor Beam action next to Beam Down and Attack; the same
  aiming panel as the Mothership's.
- **Beam Down picker:** passengers within two tiles of the carrier are
  offered with the city ones; a beamed unit shows the ordinary "moved"
  state and keeps its attack button.
- **Mothership:** a Beam Down action; the Tractor Beam button stays after
  a Move or an attack until used; aiming shows the two-step landing tile.
- **Ice Folk:** the movement range already follows the rule; the stat
  sources show Snow cover x 1.25.

Help text (one sentence each, replacing the current lines):

- **Beam Down:** a Saucer or Mothership brings one of your units from a
  city, or from up to 2 tiles away, next to itself; the unit can still
  attack but not move.
- **Tractor Beam:** a Saucer pulls a unit two tiles away one tile closer; a
  Mothership pulls a unit two or three tiles away up to two tiles closer,
  once a turn, and can still act.
- **Snow:** Ice Folk units move at half cost from Snow to Snow and have
  light cover on it unless fortified; other units stop on entering it.

**As built (`pulp_wars-1wy.5`).** The list above is implemented, with what
play needed on top of it; the
[screen flow](../ui/SCREEN_FLOW.md#current-ruleset-7-martian-overlay) has
the detail. No rule, number, or identity changes.

- **Tractor Beam:** each puller's button and unit info carry its own text
  (the Mothership's "Free once a turn" and a "Free" tag); the aiming
  preview draws the pull's path (one tile, or a crossed tile and the
  landing tile) and the pulled unit slides through both tiles.
- **Beam Down, passenger first** (like the Dwarf Tunnel): every unit the
  carrier may beam wears a "Beam" badge, the pick-up range is tinted, the
  passenger is picked on the board (until bead `pulp_wars-9im` the dock
  also had one portrait button per passenger), and the caveat is two icon
  chips ("Can attack", "No move"). A beamed unit is not shown as an
  ordinary moved unit only: it also has a "Beamed" chip, because it cannot
  be beamed again this turn.
- **Reasons and chips:** a carrier or puller that acted, a Mothership whose
  pull is spent ("Beam used"), and a Frozen carrier that moved keep their
  buttons, disabled, with the reason.
- **Ice Folk:** Snow cover reads "+25%" in the Defense row (not the
  product's fraction); the tiles a unit reaches beyond its Move by
  Snow-to-Snow steps are outlined in pale ice, with a one-line legend.
- **Gallery:** the Mothership's cue is a two-tile heavy pull; Beam Down is
  "beam down and shoot".
- **Help:** the three sentences above, unchanged.

## 12. Bead breakdown

| Bead    | Scope                                                                                                                                               | Depends on                                        | Validation profile                                                                                                                                                                                                                                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1wy.1` | this design                                                                                                                                         | —                                                 | `docs/tracker`: `npx prettier --check docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md`, links, `git diff --check`                                                                                                                                                                                                                                                |
| `1wy.2` | the human-style probe (headless only) and its **baseline** on the rules before `1wy.3`; short report section                                        | `1wy.1`                                           | `ai/map/persistence`. Worker: `npm test -- tests/unit/ruleset-v7-martian-ai.test.ts` plus the probe's own test. Root: `npm run check`, `npm run validate:ruleset6-release`. Conditional: none (no identity change).                                                                                                                                            |
| `1wy.3` | engine M1-M4 and I1-I2, one identity bump, current-rules and overlay docs                                                                           | `1wy.1`; engine queue slot (before naval step II) | `ai/map/persistence` (schema and identity). Worker: `npm test -- tests/unit/ruleset-v7-martian-*.test.ts tests/unit/ruleset-v7-ice-folk-*.test.ts` and the identity tests. Root: `npm run check`, `npm run validate:ruleset6-release`, `npm run smoke:browser:legacy-v5` (compatibility routing), `npm run smoke:browser` (a Saucer now offers a new command). |
| `1wy.4` | Martian Normal AI and play against Martians; Ice Folk AI check; head-to-head                                                                        | `1wy.3`                                           | `ai/map/persistence`. Worker: `npm test -- tests/unit/ruleset-v7-martian-ai.test.ts tests/unit/ruleset-v7-ice-folk-ai.test.ts` and the head-to-head command. Root: `npm run check`, `npm run validate:ruleset6-release`; `npm run smoke:browser` (AI-turn lifecycle).                                                                                          |
| `1wy.5` | UI: Saucer Tractor Beam, Beam Down picker, Mothership flow, Help text                                                                               | `1wy.3`                                           | `ui/presentation` plus `npm run smoke:browser`. Worker: `npm test -- tests/unit/ruleset7-martian-presentation.test.ts tests/unit/martian-render-v7.test.ts tests/unit/ruleset7-ice-folk-presentation.test.ts`.                                                                                                                                                 |
| `1wy.6` | coarse matrix and the probe after; in-bounds tuning (a further identity bump if a number moves); `docs/validation/RULESET_7_BALANCE_MARTIAN_ICE.md` | `1wy.2`, `1wy.4`                                  | `ai/map/persistence`. Worker: the matrix and probe commands. Root: `npm run check`, `npm run validate:ruleset6-release`; if a number moves, as `1wy.3`.                                                                                                                                                                                                        |

`1wy.4` and `1wy.5` can run in either order after `1wy.3`. `1wy.2` does not
bump the identity and can run while the engine queue is busy.

## 13. Open questions

**Ruled by the root (2026-10-04, epic `pulp_wars-1wy`):** 1, the Saucer's
Tractor Beam at Scouting (tier 1) is accepted; 2, the glass-cannon Grunt
(Attack 2, 9 HP) is accepted; 3, Snow cover × 1.25 is accepted. The
questions as they were asked:

1. **Tractor Beam at tier 1.** M2 puts the pull on the Saucer at Scouting.
   Acceptable, or should the Saucer's pull need Raiding (tier 2)?
2. **The glass-cannon Grunt.** M4 makes the Grunt kill and die faster (two
   Fighter hits instead of three). Is "weak bodies, real guns" the right
   reading of "grunts can't kill anything", or should the Grunt keep 10 HP
   (the first upward step of the ladder)?
3. **Snow cover.** I2 lightens it to x 1.25 (the Witch and the Mammoth are
   the units that notice). Or keep x 1.5 and change only the movement?

## Appendix A. Draft, critique, redraft

### A.1 The first draft

| #   | First-draft change                                                                          |
| --- | ------------------------------------------------------------------------------------------- |
| D1  | **Grunt hit-and-run:** an unmoved Grunt may step one tile after attacking.                  |
| D2  | **Grunt cost 2** (cheaper bodies to beam).                                                  |
| D3  | **Beam Down from any city at any time; the passenger arrives fresh** (unmoved, acts fully). |
| D4  | **Mothership Tractor Beam twice a turn, range 2-4, pulls to adjacent**; cost 8.             |
| D5  | **Ice Folk: no Snow cover at all; Glide only for Move-1 units** (no Sled glide).            |

### A.2 The critique (a skeptical designer)

- **D1 is infinite kiting by itself.** A Grunt at two tiles shoots, steps
  back to three; a Move-1 melee unit steps to two and cannot attack; repeat.
  It needs no other unit, costs nothing, and the bulk of every AI army
  (Fighters, Skeletons, Yetis, Goblins, Cavemen) is Move-1 melee. It also
  does not fix the complaint: the Grunt still deals 3. Hit-and-run belongs
  to the flyers, where each cycle costs a carrier's action and exposes it.
- **D2 feeds the wrong player.** The AI already wins with the Grunt blob;
  at 2 Coins with Attack 1.5 the screens of `pulp_wars-b5f.2` measured
  64-82%. Cheaper chip does not make a human's Grunt "a fighting force".
- **D3 is an alpha strike from nowhere.** A fresh beamed Tripod fires 12
  plus Pierce 6, a Ray Gunner 8, from a tile no opponent could watch; and
  without a once-per-turn rule two Saucers teleport one unit six tiles.
- **D4 locks cities.** Two pulls a turn from four tiles take every defender
  away from a center every turn: that is the permanent city denial the
  brief forbids. It also turns the Mothership into the only answer to
  everything, while the Saucer, the unit every army has, stays idle.
- **D5 overshoots and misses.** With no Snow cover the Witch, Mammoth, and
  Yeti feel the same at home and away (the qualitative feel the user likes
  goes); and Glide for Move-1 units only keeps the Yeti village run, which
  is the measured engine of the Ice Folk lead, while taking away the Sled's
  home mobility that nobody complained about.
- **Do the changes answer the user, or only the numbers?** The user named
  four things: the Mothership does nothing, the pull is too rare, Grunts
  cannot kill, Beam Down has too many limits. D1-D4 answered the first and
  last two partly and the pull's rarity not at all (it stayed on the rarest
  unit).

### A.3 The redraft

| First draft | Redraft                                                                                                       | Why                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| D1, D2      | **M4: Grunt Attack 2, 9 HP, cost 3**                                                                          | fixes "can't kill" directly; pays with the body, not the price; no kiting by itself       |
| D3          | **M1: after moving, pick-up within 2, passenger counts as moved, once per turn**                              | removes the two brakes the user feels; no fresh full-power ray; no chains                 |
| D4          | **M2: the pull on the Saucer** and **M3: a free, once-a-turn heavy pull (2-3, up to 2) on an 8-Coin carrier** | the trick becomes frequent on the common unit; the heavy pull is a siege tool, not a lock |
| D5          | **I1: Glide only Snow onto Snow; I2: Snow cover x 1.25**                                                      | removes exactly the village run and the Blizzard ball; keeps home mobility and some cover |

### A.4 The second critique, and what stayed

- **"Extraction is still kiting."** Yes, with a price: one carrier action
  per Grunt per turn, the carrier within about four tiles of the target and
  killed by any Raider-role unit's Charge, and ground given every turn.
  Kept, with the round-cap and extraction watch bands.
- **"The heavy pull makes Walled capitals fall."** A defender pulled two
  tiles out cannot walk back, so a city with one defender and nothing else
  in reach falls a turn later. That was already true of the one-tile pull
  for a city whose defender could not kill the stepper; the heavy pull
  makes it reliable on an 8-Coin tier-3 unit. Kept as the faction's siege
  identity, with the 50% watch band and the "heavy pull 1" fallback.
- **"Grunt Attack 2 will push the AI past 60%."** Possibly; that is why the
  ladder trims the body (HP 8) and the Mothership before the gun, and why
  acceptance also needs the probe: if the AI must be nerfed below what a
  human needs, the root brings the conflict to the user instead of picking
  silently.
- **"Is x 1.25 worth a change?"** Its rounding is close to no cover for
  small units; it matters for the Witch and the Mammoth, which are exactly
  the units that make the Ice Folk feel unkillable at home. Kept, with an
  open question.
- **"Five changes would be simpler as three."** M1 and M2 are both needed
  for the Saucer to act every turn (one pulls, one delivers); M3 answers
  the Mothership complaint; M4 the Grunt complaint; I1 the movement
  complaint. I2 is the only optional one, and it is open question 3.

## 15. Implementation notes (`pulp_wars-1wy.3`)

The engine step (`pulp-wars-poc-7r37`) implements sections 5 and 6 with the
proposed numbers. Where the design left a choice or the code needed a
precise rule, the engine does this (the current rules state each one):

1. **State shape.** The two per-turn facts are side lists of the state,
   not activation flags: `beamedThisTurn` and `tractorUsedThisTurn`, sorted
   unit IDs of the active seat's turn, emptied at its End Turn, pruned when
   a listed unit leaves the board or changes owner, public on a visible
   unit. They follow the Dwarf lists `surfacedThisTurn` and
   `bombedThisTurn`, add no key to any unit, and are empty in a match
   without a Martian seat, so such a match is the `7r36` match apart from
   the two empty lists (the pinned all-Human parity digests and the
   Human against Undead command-for-command pin did not move).
2. **A beamed unit's activation** is exactly the end of an ordinary Move:
   `moved` and `handled`, `movedPathLength` unchanged, every other flag
   kept. "It cannot Move again" also spends a pending Escape (only a
   mind-controlled Human Raider can have one when beamed); a pending
   Overrun attack is kept.
3. **"Has not landed this turn"** for the Mothership's free pull is the
   exhausted activation (Recover and Capture both set, which no turn of
   ordinary commands produces): a Mothership that landed, embarked, or was
   trained this turn cannot pull; one that moved, attacked, or beamed can.
4. **Each step of a pull must be explored by the actor.** A tile next to
   the puller always is, but the first tile of a pull from three tiles
   away is two tiles from a Mothership whose Sight is 1. Without the
   condition an unexplored tile holding a unit the actor cannot see would
   make an offered pull fail; with it the path is exact from the view (the
   Push rule has the same "explored by the attacker" condition).
5. **The technology a pull assumes for another player's unit** (Mountain
   and Deep Water entry, read from the board) is read once, from the tile
   the target stands on before the pull, for both steps.
6. **Snow cover and terrain cover.** One function gives the multiplier:
   × 1.5 on a Forest or Mountain, else × 1.25 on Snow, else none. On a
   snowy Forest or Mountain the combat preview's `snowCover` is now false
   (it was true while both were × 1.5) and the unit stats name the terrain.
7. **Shared predicates.** The Beam Down carrier, passenger, and destination
   tests and the Tractor Beam rule, actor, target, step, and path are each
   one function in `src/engine/v7/martian.ts`, called by the reducer on the
   state and by the public command query on the view; the two callers only
   collect the tile facts.
   `tests/unit/ruleset-v7-balance-martian-ice.test.ts` checks offered
   equals accepted and the previews against the events.
8. **Numbers changed by the Grunt's 9 HP elsewhere.** A second Yeti hit
   kills a Chilled Grunt by plain damage (it shattered the 10-HP one), and
   a Chilled Grunt in a Force Field dies to two Yeti hits (the second leaves 3 and
   shatters it; the 10-HP one took three). The replica's tables of section
   5.7 and 6.2 were confirmed by the engine for every value the tests pin
   (Grunt 5 / 4 / 6 / 7, three Grunts 5, 6, 1; half-power rays 3 and 5;
   Mothership 6 with 4 absorbed; a Fighter on a Yeti on Snow 5 and 3 back;
   the Witch in two hits, the Mammoth in four; a Marksman into the Blizzard
   3).
9. **Normal AI and UI.** Neither is extended here. The policy keeps its
   Saucer and Mothership rules apart by the Heavy Tractor Beam mechanic
   (both units now carry both abilities), reads a pull's final tile from
   the public query, and reads Glide and Snow cover from the new rules in
   its estimates. The dock, picker, and Help texts quote the new rules
   (section 11's sentences); the rest of section 11 is `pulp_wars-1wy.5`
   (implemented since; see section 11, "As built").

## 16. Normal AI notes (`pulp_wars-1wy.4`)

The AI step implements [section 9](#9-normal-ai-changes) without a rule or
identity change, behind one switch (`MartianPolicyOptionsV7.mobilityPlay`).
The rules, their priorities, and the measurements are in the
[Normal AI notes](../architecture/NORMAL_AI.md#martian-mobility-play-pulp_wars-1wy4).
Where it differs from section 9:

1. **Added: the siege pull is set up.** A puller flies to the tile its beam
   empties a hostile center from when an own capturer can step on (fly,
   pull, step). Section 9 only scored a pull that was already offered.
2. **Added: a carrier flies to a unit it can extract.** Section 9 had the
   extraction only when the carrier already stood in pick-up range.
3. **Not adopted: the delivery in the danger estimate** ("a carrier can put
   a Grunt shot on any tile within its Move plus three"). It was built and
   measured: the policy with it won 14 of 28 mirror games against the
   policy of `pulp_wars-1wy.3`, without it 16 of 28. A shot counted from
   every Saucer over most of an 11 x 11 board makes units hold back.
4. **Not adopted: a hover rule for Saucers** (two tiles from a hostile unit
   the own shooters stand near, the probe's reposition rule): it lost a
   36-game mirror (16 to 20) that came out 19 to 17 without it. The Saucer
   keeps its staging rule, without the "unmoved Saucer waits to beam" rule.
5. **The Grunt's threatened-city bias** was rechecked and is unchanged
   (14): a threatened city still trains Grunts.
6. **Ice Folk.** Staging, the Witch's escort, and the reach estimate read
   Glide and Snow cover from the rules (the reach estimate's Glide step is
   Snow onto Snow since `pulp_wars-1wy.3`); nothing was wrong, nothing
   changed.
7. **Result.** New against old in a Martian mirror: 20 of 36 on fresh
   seeds (55.6%), inside the noise of a mirror that the map mostly
   decides; kills 410 to 324 and losses 336 to 414 in those games.
8. **Balance signal for `pulp_wars-1wy.6`.** Against the six factions
   Martians score about 70% on small samples (43 of 60 decided games) with
   either policy, the old one included, so the rules of `7r37` put them
   above the 60% line of
   [section 8.4](#84-tuning-bounds-and-fallback-ladders), not this pass.
   The root's planned response in the measurement bead is the ladder's
   first step, Grunt HP 8, once the coarse matrix confirms it (done:
   [section 17](#17-measurement-and-the-grunt-at-8-hp-pulp_wars-1wy6)).
9. **Map curiosities.** A carrier respects the Spider avoidance of the
   curiosity-aware policy: it neither delivers nor extracts a unit onto a
   tile where a dormant Giant Spider would be provoked.

## 17. Measurement and the Grunt at 8 HP (`pulp_wars-1wy.6`)

**The change.** With the rules of `7r37` the Martians won about 70% of
their coarse games ([section 16](#16-normal-ai-notes-pulp_wars-1wy4), item
8), above the 60% line of
[section 8.4](#84-tuning-bounds-and-fallback-ladders). This bead applied
the ladder's first step and nothing else: the **Grunt has 8 HP** (was 9;
Attack 2, Defense 1.5, Shield 2, cost 3, and range 1-2 unchanged), at
identity `pulp-wars-poc-7r39`. A promoted Grunt has 13 HP. What it moves in
a fight: after one Fighter or Yeti hit (Shield 2, HP 3) a Grunt has 5 HP
left, which the second hit takes exactly, and a second Goblin Kaboom kills
it (at 9 HP it took a third). The Normal AI's
threatened-city Grunt bias went from 14 to 15, because the role value
counts HP and at 14 a threatened city trained a Ray Gunner instead
([Normal AI notes](../architecture/NORMAL_AI.md#martian-ranged-play-pulp_wars-b5f2));
no other policy value changed.

**The recheck is small on purpose** (the user's instruction: no extensive
balance testing). It is one default run of
`npm run probe:martian-mobility -- --markdown` before the change and one
after: Dry Land, two seats, Rival, round cap 150, no curiosities, 11 x 11
with seeds 0 and 1 and 14 x 14 with seed 0, both seat orders, six games
per opponent. The run now includes the Candy as a seventh opponent (a
Candy seat plays the ordinary Normal policy until `pulp_wars-jdb.4`), so
it is 42 games per arm. The "Normal" arm is the coarse matrix of this
bead: the Normal Martian AI against the Normal AI of each faction. The
full matrix of [section 8.1](#81-coarse-dry-land-matrix) (about 40 games
per pairing) was not run.

Martian wins of 6 games per opponent:

| Opponent          | Normal AI, 9 HP | Normal AI, 8 HP | Probe, 9 HP | Probe, 8 HP |
| ----------------- | --------------: | --------------: | ----------: | ----------: |
| Human             |               5 |               4 |           4 |           6 |
| Undead            |               4 |               4 |           5 |           4 |
| Goblin            |               6 |               6 |           4 |           4 |
| Dinosaur          |               4 |               3 |           5 |           4 |
| Ice Folk          |               5 |               3 |           5 |           5 |
| Dwarf             |               3 |               3 |           4 |           4 |
| Candy             |               5 |               5 |           5 |           5 |
| **All seven, 42** |  **32 (76.2%)** |  **28 (66.7%)** |  32 (76.2%) |  32 (76.2%) |
| First six, 36     |      27 (75.0%) |      23 (63.9%) |  27 (75.0%) |  27 (75.0%) |

Every game was decided: no round cap, error, stall, or rejected command.
The 9-HP columns were run at `7r38` and repeat, for the first six
opponents, the 27 of 36 that `pulp_wars-1wy.4` reported for both arms.

**Reading.** One game is 2.4 points and a 42-game win rate has a standard
error of about 7 points, so these are indications only.

- The Normal Martian AI drops by four games, from 76% to 67% (64% without
  the Candy). That is the direction the ladder wanted and it is still
  above the 60% line; the sample cannot tell 67% from 60%. It is nowhere
  near the 40% floor, so the change stays.
- The 8-HP Grunt costs the AI bodies, not kills: per Martian seat-game it
  loses 5.4 units (3.6 at 9 HP) and kills 15.2 (15.2). The Martians are
  physically weaker and deal the same damage.
- The probe, which uses every mobility tool every turn, did not lose a
  game by the change (32 of 42 both times) and loses fewer units than the
  Normal AI (3.6 against 5.4 a game at 8 HP): mobility now pays more than
  massing Grunts, which is the goal of the round. It passes the bars of
  [section 8.2](#82-the-human-style-probe): at least 50% mixed, at least
  40% against every faction (its lowest is 4 of 6), and not behind the
  Normal AI.
- Goblin 6 of 6 for the Normal AI is the one row beyond the 70/30 policy
  line in both runs; six games do not establish it.
- Watch bands of [section 8.3](#83-watch-bands) on this sample at 8 HP: a
  city fell within two rounds of a defender pulled off its center after
  about 44% of such pulls (Normal AI, 0.45 of 1.02 a game; the probe 0.24
  of 0.57), under the 50% line; no round caps.

**Not done here, by instruction:** no second ladder step. If a larger
sample later confirms the Normal AI above 60%, the next steps are the
Mothership at 9 Coins, then the heavy pull at 1 tile; both weaken mobility
rather than the body, so they need the root's (and for Grunt Attack the
user's) decision. The Ice Folk side of the acceptance (their 40-60% band
and the Witch and Glide watch bands) was not measured in this bead; in
these runs the Ice Folk lost to the Martians in 5 of 6 games at 9 HP and
in 3 of 6 (Normal AI) at 8 HP.
