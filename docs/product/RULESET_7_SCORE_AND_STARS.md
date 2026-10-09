# Ruleset 7: score, play modes, and tribe stars

**Status:** design spec (`pulp_wars-kaw6.1`, epic `pulp_wars-kaw6`). The
engine (sections 3, 4, 5, and 9) is implemented by `pulp_wars-kaw6.2` and
stated in [current rules section 3.1](RULESET_7_CURRENT.md#31-score-play-modes-and-stars)
at `pulp-wars-poc-7r65`;
the UI (sections 6 to 8) is not yet. It is an overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md) at `pulp-wars-poc-7r59`;
every rule this document does not mention stays in force. Section 12 lists
the implementation beads. Appendix A records the first draft, the
critique, and what the critique changed; appendix B holds the calibration
data of the hand-played games.

**Source.** The user, 2026-10-08 (the epic's intent): "Come up with a way
to calculate score during a battle: units killed, damage taken,
achievements, cities, territory etc., weighted so that no factor completely
dominates and none is useless; display it in the leaderboard. Then two play
modes: Domination (the current one: play until every opponent is
eliminated) and a new mode (working name 'Perfection') with 30 turns where
the highest score wins. Then update the new-game screen: as in Polytopia,
tribes are not a dropdown; all tribe icons are shown, each with 0, 1, 2 or
3 stars showing the player's best result with that tribe, across all games
in that mode. The best result relates to score but is normalised so a
gigantic map with many cities cannot buy 3 stars. A lucky flawless game
(lost nothing) gives 3 stars plus a hidden extra glow; a great game on the
hardest difficulty, eliminating all opponents yourself, gives 3 stars; 1
star is very easy (basically win); 2 stars in between. Not the same UI and
algorithm as Polytopia, the same concept: a reason to come back and collect
everything."

**Fixed by the user:** a score with units killed, damage taken,
achievements, cities, and territory among its factors, none dominant and
none useless, shown in the leaderboard; Domination as today; a 30-turn mode
won by the highest score; a tribe grid with 0 to 3 stars per tribe and
mode, the best result ever; normalised so map size cannot buy stars; a
flawless game gives 3 stars and a hidden glow; 3 stars for a great game on
the hardest difficulty with every opponent eliminated by the player; 1 star
for basically winning. Everything else is a ruling of this spec, chosen to
be simple, readable, and testable, and calibrated by hand-played text games
and arithmetic only (the user's rule: no AI-versus-AI statistics, no long
simulations).

**Ruleset ID:** the engine bead (`pulp_wars-kaw6.2`) took
`pulp-wars-poc-7r65`.

**Words.** A _turn_ in the user's words is a _round_ here: every seat plays
once per round, and "30 turns" means rounds 1 to 30. _Tribe_ is the
player-facing word for a faction. _Rival_ means another player (an AI seat)
whatever the AI mode.

## 1. Summary

| Piece          | One sentence                                                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Score**      | Every player's score is territory, city levels, technology, achievements, army, and kills, minus units lost and damage taken; the penalty never takes away more than half.                            |
| **Domination** | Today's game: you win when every rival is eliminated and lose when you are.                                                                                                                           |
| **Perfection** | 30 rounds; after round 30 the highest score wins (eliminating every rival earlier still wins at once, and being eliminated still loses).                                                              |
| **Rating**     | At the end, your score divided by the best rival's highest score, both measured no later than round 30.                                                                                               |
| **Stars**      | 1 star: win. 2 stars: win with a rating of 1.5 or more (higher with fewer rivals). 3 stars: a rating of 2 or more on the hardest setup, and in Domination every rival eliminated by you. Flawless: 3. |
| **Glow**       | A win in which you lost no unit and no city, with at least the 2-star rating, gives 3 stars and a hidden glow.                                                                                        |
| **Tribe grid** | The new-game screen shows every tribe's emblem with its best stars (and glow) in the chosen mode; the record is kept in the browser and never lowered.                                                |

## 2. Pillars

1. **One honest number.** The score is a fair, glanceable summary of how a
   player is doing; within a match it ranks players the way a spectator
   would.
2. **No factor rules, none is decoration.** In the hand-played games
   (section 3.6) no positive factor is more than 42% of a player's points
   and every factor that can be non-zero by then is a few percent or more.
3. **Stars measure play, not the map.** The rating compares you with your
   own rivals on the same board, so a bigger board or a longer game cannot
   buy a star.
4. **Readable rules.** Every weight is a small whole number of points per
   counted thing, and the leaderboard shows the arithmetic.
5. **Deterministic and replayable.** The score is a pure function of the
   match state; the counters it needs are part of the state, so saves and
   replays reproduce it exactly.

## 3. The score

### 3.1 Factors and weights

| Factor           | Counts                                                                                 | Points       | Natural limit                                                                       |
| ---------------- | -------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| **Territory**    | tiles of your cities' land                                                             | 2 per tile   | the board; 9 per city plus 16 per Land Grant                                        |
| **Cities**       | the sum of your cities' levels                                                         | 10 per level | each level needs one more population than the last (diminishing)                    |
| **Technology**   | the sum of the tiers of your researched technologies                                   | 8 per tier   | 55 tiers (44 on Dry Land): 25 technologies, 5 of tier 1, 10 of tier 2, 10 of tier 3 |
| **Achievements** | achievements unlocked                                                                  | 40 each      | 7                                                                                   |
| **Army**         | the value of the units you command now                                                 | 1 per Coin   | your unit slots                                                                     |
| **Kills**        | the value of enemy units whose death is credited to you                                | 2 per Coin   | the rating stops counting at round 30 (section 5.1)                                 |
| **Losses**       | the value of your units that died                                                      | −1 per Coin  | the penalty cap                                                                     |
| **Damage taken** | Hit Points your units lost                                                             | −1 per 5 HP  | the penalty cap                                                                     |
| **Penalty cap**  | Losses and Damage taken together never take away more than half of the positive points | —            | —                                                                                   |

```text
positive = 2 × T + 10 × L + 8 × R + 40 × A + V + 2 × K
penalty  = X + floor(H / 5)
score    = positive − min(penalty, floor(positive / 2))
```

`T` territory tiles, `L` sum of city levels, `R` sum of researched tiers,
`A` achievements unlocked, `V` army value, `K` kill value, `X` loss value
(all in Coins of unit value), `H` HP lost. Every quantity is a whole
number, so the score is a whole number and never negative.

**Why these weights** (the coin-equivalent reasoning, checked against the
games of section 3.6):

- A **Land Grant** costs 1 Coin per tile and gives 2 points per tile, the
  best buy in the game but once per level-3 city and only on explored
  neutral land; a **village** captured is 9 tiles and level 1, 28 points.
- A **city level** takes about 2 to 3 Coins of harvests or buildings per
  population and one more population each level, so 10 points is roughly
  the Coins it took.
- A **technology** costs 5 to 9 Coins plus 1 to 3 per extra city
  (`technologyResearchCostV7`), so 8, 16, or 24 points is roughly 1 point
  per Coin with three to five cities.
- An **achievement** is a rare feat that also funds a Monument; 40 points
  is four city levels, enough to matter, too few to replace a city.
- **Army** at 1 point per Coin means a Coin spent on a unit is worth about
  as much as a Coin spent on research or growth (section 3.5).
- A **kill** swings 4 points per Coin of the victim between two players:
  +2 for the killer, −1 Losses and −1 Army for the victim.

### 3.2 Exact definitions

- **Territory `T`.** The number of board tiles whose territory city
  (`TileStateV7.territoryCityId`) is owned by the player
  ([current rules section 4.1](RULESET_7_CURRENT.md#41-territory)).
- **Cities `L`.** The sum of `level` over the cities the player owns
  ([section 4.2](RULESET_7_CURRENT.md#42-population-growth-and-levels)).
- **Technology `R`.** The sum of `tier` over the player's
  `researchedTechs`, read from the player's faction tree (every tree has
  the same tiers). A mission's starting technologies count, but missions
  record no stars (section 6).
- **Achievements `A`.** The player's entitlements with `unlocked` true,
  spent or not ([section 5](RULESET_7_CURRENT.md#5-achievements-and-monuments)).
- **Unit value.** A unit's value is the printed cost of its role under the
  registration of its kind (`effectiveRoleRuleV7(role, kind).cost`): a
  Fighter 2, a Champion 6, a Battleship 16, an Egg the cost of its role. A
  role with no printed cost (the reward giant of every faction) is worth
  **12** (`SCORE_GIANT_VALUE_V7`), and the neutral Giant Spider **10**
  (its bounty); every other neutral unit of the map curiosities is worth
  its bounty too (a Grunt 3, a Ray Gunner or Shield Projector 4, a Zombie
  5, Bigfoot 12; `pulp_wars-737.14`). Risings, reward units, chest units, and controlled units
  have the value of their role; nobody paid for them, but they are worth
  what the role costs.
- **Army `V`.** The sum of the values of the units the player commands
  now: its own units on the board and burrowed, Eggs included, and units
  it controls by Mind Control or boarding (the units the existing
  "everything a player owns" reader returns for it after control is
  resolved). A unit under another player's control counts for that
  player.
- **Kills `K`.** For every death the engine already credits to a player
  (the credited-death records that Plunder reads,
  [section 18.9](RULESET_7_CURRENT.md#189-kill-credit-plunder-and-friendly-fire)),
  when the credited player is a player (not the Monster) and the victim's
  owner is hostile to it (the Monster is hostile to everyone), the
  credited player's `K` grows by the victim's value. Retaliation kills,
  splash, Wail, bombs, eruptions, and an exploding unit's blast count;
  Plague, Kaboom, crushes, Brain loss, elimination removals, and an Egg
  destroyed by a capture credit nobody. Friendly fire and allied victims
  never count.
- **Losses `X`.** For every `UNIT_DIED` of a unit the player commanded at
  that moment, whatever the cause, except `ELIMINATION` and `BRAIN_LOST`
  (removals, not losses), its `X` grows by the unit's value. A rising
  victim still counts (it died). A disbanded unit is not a loss (its slot
  and Army value are gone already; it does end a flawless game, section
  5.4).
- **Damage taken `H`.** After every accepted command, for every unit the
  player commanded before the command: `max(0, hp before − hp after)`,
  where `hp after` is 0 if the unit died in the command, is added to the
  player's `H`. Units removed by `ELIMINATION` or `BRAIN_LOST` and units
  that left the player's control without dying are skipped. Shield
  absorbed by a Martian unit is not HP and is not counted. Healing inside
  the same command is netted (a Start Turn that deals 3 Plague damage and
  heals 2 at a Windmill adds 1); this is deliberate: the rule is exact,
  cheap, and catches every source of damage without listing them
  (appendix A, C9).
- **Eliminated players** keep their counters: their Technology,
  Achievements, Kills, Losses, and Damage stay, and their Territory,
  Cities, and Army are 0. The penalty cap keeps their score at 0 or more.

### 3.3 When it updates

The score is a pure function of the state (`scoreV7(state, playerId)`),
so every view shows the current value after every accepted command. The
reducer keeps, per player, the counters the state does not otherwise hold:
`killValue` (`K`), `lossValue` (`X`), `hpLost` (`H`), `flawless` (true
until the player loses anything, section 5.4), `eliminatedBy` (the player
whose capture took its last city), `peakScore` (section 5.1), and
`round30` (section 5.1). The counters start at 0, `true`, `null`, the
starting score, and `null`.

**Round end.** A _round end_ is the moment the last seat in turn order has
ended its turn, after `TURN_ENDED` and before the neutral turn and the next
round's first Start Turn. At every round end the reducer sets each
player's `peakScore` to the larger of it and the current score; at the end
of round 30 it also stores `round30 = { score, peakScore }` for every
player.

### 3.4 What other players can see

- **Totals are public.** The leaderboard already shows every player's city
  and unit counts whatever the fog
  ([`PublicLeaderboardEntryV7`](../../src/engine/v7/view.ts)); it gains every
  player's score total in the same way (computed by the view builder from
  the full state, like `cityCount`). A total reveals no tile, unit, or
  technology.
- **The breakdown is private until the end.** The viewer's own breakdown
  (each factor's count and points, the penalty, and the cap) is in its
  view. Another player's breakdown is shown only when the match is over.
- **Peaks are public** (they are past totals). The rating and the stars
  are computed at the end (section 5).

This is open question 3: the default keeps the leaderboard honest and
simple; the alternative hides the totals of players you have never seen.

### 3.5 Incentives checked

- **Last-turn spending in Perfection.** Every scored purchase is worth
  about 1 point per Coin: a unit 1 per Coin, a tier-3 technology with five
  cities 24 points for 21 Coins, growth 10 points a level for roughly 5
  to 10 Coins of harvests or buildings. No single dump dominates, and
  spending Coins well is good play anyway.
- **Kill farming.** A kill is +2 per Coin, but the attacker's risk of
  Losses (−1) and Damage (−1 per 5 HP) is real; trading units evenly earns
  nothing net.
- **Turtling.** A player who never fights keeps Army and avoids penalties
  but gets no Kills; in the games the Kills factor was 7% to 30% of a
  leader's points by round 30, so turtling costs a real share.
- **Disbanding doomed units** avoids the Losses penalty (the Army value is
  gone either way and half the cost comes back); it is allowed, and it
  ends a flawless game (section 5.4).

### 3.6 Calibration: hand-played games

Three text-mode games (`npm run play:text`, [text play](../validation/TEXT_PLAY.md))
at `pulp-wars-poc-7r59`, curiosities on, all played by hand by the spec
worker as seat 0 (Human) against Normal AI seats:

| Game     | Command                                                                                    | How it went                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Small    | `new --map dry-land --size 11 --seed 21 --factions original,undead`                        | 11 x 11, 1 rival. Led on cities and kills to round 20, then lost the capital and a city to Zombie infections; 3 cities against 5 at round 30. |
| Large I  | `new --map dry-land --size 20 --seed 33 --factions original,goblin,dinosaur,martian,ice`   | 20 x 20, 4 rivals. The Ice Folk took the capital by round 13; abandoned at round 15 (data to round 15).                                       |
| Large II | `new --map dry-land --size 20 --seed 44 --factions original,goblin,dinosaur,martian,candy` | 20 x 20, 4 rivals. Led to round 25 (8 cities at round 17, Land Baron and Slayer), then lost cities to three neighbours; 2 cities at round 30. |

The counts were read by replaying each session's command log in a scratch
script (not checked in) that applies the definitions of section 3.2, with
one approximation: a kill is credited to the acting player (the defender
for a retaliation kill), so a blast is credited to the player who set it
off rather than the exploding unit's owner; the engine bead uses the exact
credit of section 18.9. The table
gives each factor's points (largest positive share of a player's points in
brackets) and the range of shares across the players of that map and
round; appendix B has every player's row.

| Map and round           | Territory   | Cities       | Technology   | Achievements | Army       | Kills        | Losses      | Damage       |
| ----------------------- | ----------- | ------------ | ------------ | ------------ | ---------- | ------------ | ----------- | ------------ |
| 11 x 11, 2 players, R10 | 72 (27–30%) | 70 (25–30%)  | 40 (13–20%)  | 40 (13–20%)  | 16 (6–7%)  | 12 (2–7%)    | −6 (1–5%)   | −10 (3–5%)   |
| 11 x 11, R20            | 72 (16–19%) | 100 (21–27%) | 112 (23–33%) | 40 (8–12%)   | 34 (8–9%)  | 51 (9–15%)   | −26 (3–10%) | −39 (7–13%)  |
| 11 x 11, R30            | 72 (10–13%) | 115 (15–21%) | 180 (25–34%) | 80 (7–17%)   | 52 (5–11%) | 126 (13–30%) | −63 (8–12%) | −85 (13–14%) |
| 20 x 20, 5 players, R10 | 58 (26–42%) | 52 (21–39%)  | 40 (16–34%)  | 0 (0%)       | 16 (4–13%) | 8 (0–15%)    | −4 (0–6%)   | −4 (0–6%)    |
| 20 x 20, R20            | 86 (18–31%) | 114 (26–35%) | 90 (23–26%)  | 8 (0–8%)     | 30 (5–13%) | 31 (3–20%)   | −16 (1–10%) | −17 (2–11%)  |
| 20 x 20, R30            | 94 (8–21%)  | 190 (13–38%) | 154 (14–42%) | 48 (0–17%)   | 54 (2–15%) | 104 (7–23%)  | −55 (1–43%) | −56 (1–45%)  |

Points are the mean over the players of that map and round (2 players on
the small map; 10, 5, and 5 player rows on the large maps). Shares are of
the player's positive points.

**Reading the table.**

- **Nothing dominates.** The largest positive share any player had was 42%
  (Territory for the Candy AI at round 10 of Large II, Technology for the
  author's collapsed empire at round 30). Typical leaders split 20–38%
  across Cities, Technology, Territory, and Kills.
- **Nothing is useless.** Every factor but Achievements is non-zero for
  nearly every player by round 20, and every factor matters at round 30: Army 2–15%, Kills 7–30%, Achievements
  7–17% where earned (none are earned by round 10 on a 20 x 20 board; the
  first, Explorer, needs half the board explored), Losses and Damage 1–14%
  of the positive points for a normal player.
- **The penalty cap bites only on a collapse.** It acted once in the 31
  player rows of appendix B: the Candy AI at round 30 of Large II (98 Coins of units
  lost, 514 HP), whose penalty of −200 was capped at −113.
- **The ranking is right.** At round 30 of the small game the Undead AI,
  which had taken the author's capital (5 cities against 3, 24 units
  against 7), leads 521 to 433 although the author killed more (30 units
  against 17). In Large II the three big AI empires lead (Martian 797,
  Dinosaur 780, Goblin 698), then the author's two-city remnant (363), then
  the crushed Candy (113).
- **Small and large maps behave alike.** Territory and Cities carry the
  early game everywhere; by round 30 Technology and Kills catch up. The
  large map's bigger empires show in Cities (38% for the Dinosaur AI's ten
  cities) without crowding out the rest.

## 4. Play modes

### 4.1 Domination

Today's rules ([current rules section 3](RULESET_7_CURRENT.md#3-players-turns-and-victory)):
the human wins when every rival is eliminated and loses at once when
eliminated. The score is shown but decides nothing. It is the default and
the mode of every save made before this spec.

### 4.2 Perfection

- **Length.** The match ends at the round end of round 30 (section 3.3):
  the last seat in turn order ends its round-30 turn, and instead of the
  neutral turn and round 31 the match is over. Nothing of round 31 happens
  (no income, no healing, no Start Turn events).
- **Ranking.** Every player still in the match is ranked by score; ties go
  to more cities, then more territory tiles, then the earlier place in the
  turn order. Eliminated players rank below every surviving player, the
  later eliminated above the earlier.
- **Result.** The human wins (`VICTORY`) if ranked first and otherwise
  loses (`DEFEAT` with the first-ranked player as `defeatedByPlayerId`);
  the outcome records that the score decided it (section 9.3).
- **Early end.** Elimination works as in Domination: the human loses at
  once when eliminated, and wins at once when every rival is eliminated
  before round 30 (the remaining rounds are not played).
- **Ties for first** with the human therefore go by cities, territory, and
  turn order like every tie; there is no draw.
- **AI.** The AI never plays for score, and there is no Perfection AI (the
  user, 2026-10-09). In every mode the Normal AI builds its economy and
  conquers exactly as it does in Domination; it does not read the mode or
  the score (no identity change in the AI). It still scores by expanding
  and fighting. It stays legal in Perfection: when an AI seat is last in
  turn order, its round-30 `END_TURN` ends the match like any other seat's.
- **What the player sees.** The leaderboard and the top bar show "Round
  23 of 30"; the leaderboard's lede reads "Highest score after round 30
  wins." instead of "Capture every enemy city to win."

### 4.3 Setup, saves, and identity

- **Setup field.** `MatchSetupV7.gameMode: "DOMINATION" | "PERFECTION"`, a
  required key on new setups; `PERFECTION_ROUNDS_V7 = 30`. The name
  `gameMode` avoids confusion with `aiMode` (Rival or Cooperative).
- **Legal combinations.** Every generated map type, size, and seat count
  takes either mode. A `SHOWCASE` or `MISSION` setup is always
  `DOMINATION` (the setup screen hides the mode choice for the Showcase,
  and a mission's setup comes from the mission).
- **Saves and replays.** The mode is part of the setup, so saves and
  replays carry it; a save or replay without the key loads as
  `DOMINATION`. The new counters (section 3.3) and the score rules are an
  identity change: the engine bead takes the next `7rNN` and updates the
  pins.
- **Headless.** The headless CLI and `play:text` take `--mode
domination|perfection` (default domination); `play:text` prints the
  score in its header, the leaderboard in `view`, and the breakdown per
  round in `debrief`.

## 5. Stars

### 5.1 The rating

```text
rating = your score at the rating moment
         ÷ the highest peakScore of any rival at the rating moment
```

- **The rating moment** is the end of the match if it ends at or before
  the round end of round 30, and the round end of round 30 otherwise (the
  stored `round30` values: your `score` and each rival's `peakScore`).
- A rival's **peak** is its highest score at any round end up to the
  rating moment (section 3.3), and, for a match that ends before a round
  end, its score at the end if that is higher.
- The rating is a ratio of two scores on the same board, so it is computed
  with exact integers and reported rounded down to two decimals; the
  thresholds compare the exact fraction (`your × 100 ≥ threshold × 100 ×
rival`).
- A rival's peak is never 0 (every player starts with a city: at least 28
  points).

### 5.2 Thresholds

The thresholds depend on the number of rivals at setup (`aiCount`):

```text
2-star rating = 1.5 + 0.25 × max(0, 3 − rivals)
3-star rating = 2.0 + 0.5  × max(0, 3 − rivals)
```

| Rivals    | 2 stars | 3 stars |
| --------- | ------: | ------: |
| 1         |    2.00 |    3.00 |
| 2         |    1.75 |    2.50 |
| 3 or more |    1.50 |    2.00 |

With one rival your score absorbs everything the only rival loses and
ratios run high (the small game's author stood at 1.46 to 1.66 between
rounds 10 and 20 while the war was undecided); with three or more rivals the
best of them is the bar and the rivals also fight each other (the leaders
of Large I and II, AI or human, stood at 1.3 to 1.55 mid-game).

### 5.3 The grade

At the end of a match the engine grades the human's result:

| Grade                | Domination                                                                                                                                                                 | Perfection                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 0 stars              | a defeat                                                                                                                                                                   | a defeat (eliminated, or not ranked first)                  |
| 1 star               | a victory                                                                                                                                                                  | a victory                                                   |
| 2 stars              | a victory with the 2-star rating                                                                                                                                           | a victory with the 2-star rating                            |
| 3 stars              | a victory with the 3-star rating, on the hardest difficulty (section 5.5), in which **every rival was eliminated by your capture** (`eliminatedBy` is you for every rival) | a victory with the 3-star rating, on the hardest difficulty |
| 3 stars and the glow | a **flawless** victory (section 5.4) with at least the 2-star rating, on any difficulty                                                                                    | the same                                                    |

A grade is the highest row whose conditions hold. Perfection asks for no
eliminations: its goal is the score. In Cooperative mode the rivals are
allies and cannot capture each other's cities, so in Domination every
elimination is yours.

### 5.4 Flawless

A player is **flawless** while none of these has happened to it in the
match: a unit it commanded died (`UNIT_DIED`, any cause, Kaboom and
Plague included), was disbanded (`UNIT_DISBANDED`, Abandon Egg included),
or came under another player's control (Mind Control, boarding), or was
swallowed by an Abomination (`UNIT_SWALLOWED`, added at `7r65` with the
giants' signatures); a city it owned was captured. Hatching, growth, Promotion, and Assemble are not
losses. Damage is allowed: "lost nothing" means no unit and no city. The
state keeps it as the `flawless` flag (section 3.3); an engine audit test
lists every event that removes a unit or a city from a player and checks
each one clears the flag.

The 2-star rating is required so that a pacifist Perfection game on a big
board (never meeting anyone, so never losing anything) does not earn the
glow without outplaying the rivals (appendix A, C7).

### 5.5 The hardest difficulty

`MatchSetupV7.aiDifficulty` is only `"NORMAL"` today, so **Normal is the
hardest difficulty and every match meets the condition**
(`HARDEST_AI_DIFFICULTY_V7 = "NORMAL"`). The AI head start of
`pulp_wars-w49.7` (AI seats start with 2 or 3 cities) is the expected
difficulty lever: when it lands, the hardest difficulty is the largest
head start the setup screen offers, and the 3-star row (not the flawless
row) asks for it. A head start also raises the rivals' scores and so
lowers the rating by itself. Stars already recorded are never lowered when
a harder difficulty appears (open question 2).

### 5.6 Worked examples

Scores use section 3.1; the Points column shows the positive points and then the penalty.

**A. Small map, easy win: 2 stars.** Domination, 11 x 11 Dry Land, 1 rival
(Goblin). You take the Goblin capital, its last city, in round 16.

| Who                   | Tiles | Σ levels | Σ tiers | Ach. | Army | Kills | Lost | HP lost | Points                                                   | Score |
| --------------------- | ----: | -------: | ------: | ---: | ---: | ----: | ---: | ------: | -------------------------------------------------------- | ----: |
| You at the end (R16)  |    54 |       13 |      11 |    1 |   26 |    24 |    8 |      64 | 108 + 130 + 88 + 40 + 26 + 48 = 440; penalty 8 + 12 = 20 |   420 |
| Goblin peak (R11 end) |    27 |        6 |       5 |    0 |   16 |     8 |    6 |      32 | 54 + 60 + 40 + 0 + 16 + 16 = 186; penalty 6 + 6 = 12     |   174 |

Rating 420 ÷ 174 = 2.41: at least 2.00 (2 stars, 1 rival) and below 3.00:
**2 stars**. You lost units, so no glow. A 3-star 1-rival win needs three
times the Goblins' best score.

**B. Huge map grind: 1 star.** Domination, 25 x 25, 7 rivals. You win in
round 64 with a final score of 3,900, many times any rival's peak; but the
rating moment is the end of round 30:

| Who                    | Tiles | Σ levels | Σ tiers | Ach. | Army | Kills | Lost | HP lost | Points                                                        | Score |
| ---------------------- | ----: | -------: | ------: | ---: | ---: | ----: | ---: | ------: | ------------------------------------------------------------- | ----: |
| You at R30             |   117 |       40 |      30 |    2 |   70 |    60 |   30 |     180 | 234 + 400 + 240 + 80 + 70 + 120 = 1,144; penalty 30 + 36 = 66 | 1,078 |
| Best rival peak by R30 |   108 |       34 |      24 |    1 |   90 |    50 |   20 |     150 | 216 + 340 + 192 + 40 + 90 + 100 = 978; penalty 20 + 30 = 50   |   928 |

Rating 1,078 ÷ 928 = 1.16, below 1.50: **1 star**. The 34 rounds of grind
after round 30 and the 3,900 points buy nothing; a 3-star result on this
board needs twice the best rival's score by round 30 and every one of the
seven eliminations made by you.

**C. Flawless: 3 stars and the glow.** Domination, 14 x 14 Pangea, 2
rivals. You win in round 21 without losing a unit or a city (your units
took 46 HP of damage in all).

| Who                   | Tiles | Σ levels | Σ tiers | Ach. | Army | Kills | Lost | HP lost | Points                                                  | Score |
| --------------------- | ----: | -------: | ------: | ---: | ---: | ----: | ---: | ------: | ------------------------------------------------------- | ----: |
| You at the end (R21)  |    63 |       17 |      16 |    2 |   34 |    30 |    0 |      46 | 126 + 170 + 128 + 80 + 34 + 60 = 598; penalty 0 + 9 = 9 |   589 |
| Best rival peak (R14) |    45 |       10 |      10 |    0 |   24 |    10 |    8 |      40 | 90 + 100 + 80 + 0 + 24 + 20 = 314; penalty 8 + 8 = 16   |   298 |

Rating 1.97, at least 1.75 (2 stars, 2 rivals), and flawless: **3 stars
and the glow**, whoever eliminated the rivals and on any difficulty.

**D. Hard elimination game: 3 stars.** Domination, 16 x 16 Continents, 3
rivals, Rival mode, Normal (the hardest today). You take each rival's last
city yourself and win in round 27.

| Who                   | Tiles | Σ levels | Σ tiers | Ach. | Army | Kills | Lost | HP lost | Points                                                       | Score |
| --------------------- | ----: | -------: | ------: | ---: | ---: | ----: | ---: | ------: | ------------------------------------------------------------ | ----: |
| You at the end (R27)  |    99 |       30 |      24 |    3 |   48 |    70 |   16 |     120 | 198 + 300 + 192 + 120 + 48 + 140 = 998; penalty 16 + 24 = 40 |   958 |
| Best rival peak (R19) |    54 |       14 |      14 |    1 |   30 |    22 |   10 |      60 | 108 + 140 + 112 + 40 + 30 + 44 = 474; penalty 10 + 12 = 22   |   452 |

Rating 2.11, at least 2.00 (3 rivals), every elimination yours, hardest
difficulty: **3 stars**. The same game in which the Goblin AI had taken the
Dinosaurs' last city is **2 stars**: the rating is there, but not every
rival fell to you.

**E. Perfection, strong but not excellent: 2 stars.** 20 x 20, 4 rivals.
After round 30:

| Who               | Tiles | Σ levels | Σ tiers | Ach. | Army | Kills | Lost | HP lost | Points                                                         | Score |
| ----------------- | ----: | -------: | ------: | ---: | ---: | ----: | ---: | ------: | -------------------------------------------------------------- | ----: |
| You at R30        |   144 |       46 |      34 |    3 |   80 |    90 |   24 |     160 | 288 + 460 + 272 + 120 + 80 + 180 = 1,400; penalty 24 + 32 = 56 | 1,344 |
| Best rival (peak) |    90 |       28 |      20 |    1 |   60 |    40 |   20 |     140 | 180 + 280 + 160 + 40 + 60 + 80 = 800; penalty 20 + 28 = 48     |   752 |

Ranked first: a victory. Rating 1.78: at least 1.50, below 2.00: **2
stars**.

**F. Perfection, outscored: 0 stars.** 11 x 11, 1 rival. After round 30
you have 433 and the Undead 521 (the small game of section 3.6 at round
30): the Undead rank first, the human is defeated, nothing is recorded.

### 5.7 Why size cannot buy stars

- The rating divides by a rival's score on the **same board**: a bigger
  board grows the rivals' scores too (Large II's AIs reached 700–800 by
  round 30 against 520 for the small game's leader).
- The rating stops at **round 30**: a long grind (example B) adds score
  after the rating moment that counts for nothing.
- The rival's **peak** is the bar, so crushing a rival late does not lower
  it; only staying ahead of everyone does.
- **Fewer rivals raise the bar** (section 5.2), so the 1-rival game, where
  every capture moves the ratio twice, is not the easy way to 3 stars.

## 6. Records

- **Key.** `pulpWars.stars.v1` in localStorage, owned by a
  `TribeStarsStoreV7` beside `CampaignProgressStoreV7`. Like
  [campaign progress](CAMPAIGN.md#41-storage) it is not a save key: never
  in `OBSOLETE_SAVE_STORAGE_KEYS_V7`, untouched by ruleset identity changes
  and by "Delete save"; at most 64 KiB.
- **Shape.**

  ```json
  {
    "format": "pulp-wars-tribe-stars",
    "version": 1,
    "modes": {
      "DOMINATION": {
        "GOBLIN": {
          "stars": 2,
          "glow": false,
          "bestRating": 2.41,
          "firstAt": "2026-10-08T12:00:00.000Z",
          "updatedAt": "2026-10-08T12:00:00.000Z"
        }
      },
      "PERFECTION": {}
    }
  }
  ```

  `stars` is 1 to 3 (a tribe with no record shows 0), `glow` a boolean,
  `bestRating` the best rating of any recorded win (two decimals). Unknown
  modes and factions are kept and ignored.

- **Never lowered.** Recording a result sets `stars` to the larger,
  `glow` to either, and `bestRating` to the larger; `updatedAt` changes
  only when something improved. Recording is idempotent.
- **What records.** A human victory in a generated match (not `SHOWCASE`,
  not `MISSION`, never a setup with `allowDuplicateFactions`), under the
  human seat's faction and the match's `gameMode`. A defeat records
  nothing. The controller records before the end-of-match dialog renders
  and again when a completed save is resumed, as the campaign does.
- **Unreadable records** (bad JSON or shape): the tribe grid shows no stars
  and the line "Tribe records can't be read." with a Reset button; nothing
  is recorded until reset. Settings has "Reset tribe stars" behind a
  confirmation.
- **Migration.** None: the key is new. A later version reads version 1 and
  writes its own.
- **Per profile** means per browser profile (one localStorage origin), the
  same scope as the save and the campaign.

## 7. New-game screen

The "New game" panel (`#setupForm` in `src/render/dom/app-view-v7.ts`)
becomes, top to bottom:

1. **Game mode.** A two-button toggle, "Domination" and "Perfection", with
   one line under it: "Win by taking every rival's last city." or "30
   rounds. The highest score wins." The choice is remembered for the next
   game (a `pulpWars.ruleset7.*` preference).
2. **Your tribe.** A grid of every tribe (eight today), each card the
   tribe's emblem (the existing Fighter portrait in the tribe colour,
   `#factionEmblem`, no new art), its name, and three star slots, filled
   for the tribe's best stars in the selected mode. The cards are a radio
   group (arrow keys move, Space or Enter picks; `aria-label` "Goblin, 2 of
   3 stars in Domination"). The picked card has the tribe colour outline;
   picking a tribe plays its theme as the select does today. The grid
   replaces the "Your faction" select.
3. **The glow.** A tribe whose record has `glow` shows its three stars
   with a soft gold halo (animated shimmer, static under reduced motion)
   and "flawless" in its accessible label. Nothing on the screen explains
   it before it is earned.
4. **How stars are earned.** An info button beside the heading opens the
   rules for the current opponent count: "★ Win. ★★ Win with 1.5 times the
   best rival's score. ★★★ Win with 2 times the best rival's score on the
   hardest difficulty, and in Domination take every rival's last city
   yourself." (numbers from section 5.2).
5. **The existing options**, unchanged: Players (Opponents and the AI
   mode select), Map, Size, Curiosities, seed, the opponents' faction
   selects (seats 1 and up; the human's tribe is the grid's), and Play.
   The AI mode select's label "Mode" becomes "Alliances" so the screen
   has one "mode" (open question 7).
6. **Showcase.** Choosing the Showcase map disables the Perfection button
   (Domination only) and shows the stars greyed (no record is made).
7. **Phone.** The grid is 4 x 2 cards at 360 px wide (about 76 px each),
   8 x 1 on wide screens; the toggle is full width.
8. **Stars use an interface glyph**: a `star` entry in the monochrome UI
   icon set (`src/render/dom/ui-icons-v7.ts`, code-drawn, not PixelLab
   art), filled or outlined.

## 8. Leaderboard and end of match

- **Leaderboard** (`#leaderboard`): a score column for every player; the
  viewer's row opens a breakdown (each factor's count and points, the
  penalty, and the cap when it acts). In Perfection the lede reads
  "Highest score after round 30 wins." with "Round N of 30". Phones keep
  one row per player; the breakdown opens below the row.
- **End of match** (`#resultSeats`): final scores in rank order, every
  player's breakdown, and for a win the grade: the stars, "×1.83 the best
  rival's score" (the rating), the conditions met and missed ("Take every
  rival's last city yourself for 3 stars"), and "New best for the Goblins
  in Domination" when the record improved. The glow appears only when
  earned. Perfection names the winner by score.

## 9. Engine impact

### 9.1 Identity and compatibility

One identity bump (section 4.3). Pinned matches of the previous identity
replay unchanged apart from the identity, the setup key, and the new
counters; no rule outside this spec changes, and the Normal AI does not
change (it never optimises for score in any mode, section 4.2).

### 9.2 State

- `MatchSetupV7.gameMode` (section 4.3).
- Per player, a score ledger: `killValue`, `lossValue`, `hpLost`,
  `flawless`, `eliminatedBy`, `peakScore`, `round30` (section 3.3).
- In Perfection, the final ranking at the end.

### 9.3 Results, queries, and views

- `scoreV7(state, playerId)` returns the breakdown of section 3.1 (pure).
- `PublicLeaderboardEntryV7.score` (every player), the viewer's breakdown
  in `PlayerViewV7`, every player's breakdown once `outcome` is set, the
  `gameMode`, and in Perfection the rounds left.
- `queryScoreV7(view)` (the public query the UI reads; it reads only the
  view) and `queryStarGradeV7(view)` after the end: stars, glow, rating
  (exact fraction and two-decimal display), the rating round, the
  thresholds, and each condition met or missed.
- `MatchOutcomeV7`: a Perfection result is `VICTORY` or `DEFEAT` as in
  section 4.2 with a `decidedBy: "SCORE"` field (absent for elimination
  results, so older outcomes parse unchanged); the engine bead may choose
  an equivalent shape.
- The grade inputs (rating, eliminations, flawless) are computed by the
  engine from the state; the browser only records the result.

### 9.4 Headless and text play

`--mode` (section 4.3); the headless match summary and `play:text`
`debrief` include each player's score per round and the grade.

## 10. Test plan

1. **Score.** Each factor alone (a fixture per factor), the weights, the
   penalty cap at, below, and above half, never negative, integer
   arithmetic; worked examples A to E as fixtures with the exact scores.
2. **Counters.** Kills follow the credited-death records in every cause of
   section 18.9 (a parity test against Plunder credit); allied, friendly,
   and Monster kills; Losses for every `UNIT_DIED` cause but the two
   removals; Damage with the net-of-heal rule, Shield excluded,
   control changes skipped; peaks at round ends; `round30`.
3. **Flawless.** The audit test of section 5.4 over every removal event.
4. **Perfection.** Ends at the round end of round 30 with no round-31
   events; ranking and every tie-break; early victory and early defeat;
   the human outscored is a defeat.
5. **Grade.** Every row of section 5.3, the thresholds for 1, 2, 3, and 7
   rivals at the exact boundaries, the rating moment before and after
   round 30, eliminations by another rival.
6. **Persistence.** Saves of both modes round-trip; a save without
   `gameMode` loads as Domination; replays reproduce scores.
7. **Records.** Parse, write, never lowered, idempotent, unreadable and
   reset, not a save key (the storage-isolation test grows by one key),
   recorded on resume of a completed save, not recorded for Showcase,
   missions, or defeats.
8. **UI.** The grid's keyboard and labels, stars per mode, the glow and
   reduced motion, phone layout, the leaderboard column and breakdown, the
   end-of-match grade; the smoke starts a Perfection match.

## 11. Acceptance criteria

1. The score of section 3 is implemented exactly, shown in the
   leaderboard, and its breakdown explains it; worked examples A to E
   reproduce to the point.
2. Perfection ends after round 30 and ranks per section 4.2; Domination is
   unchanged; saves of both modes round-trip and legacy saves load as
   Domination.
3. The grade of section 5 is computed at the end and recorded per section
   6, never lowered; the tribe grid shows stars and the glow per mode.
4. No factor exceeds half of a typical player's positive points in the
   pinned text-play sessions at rounds 10, 20, and 30, and every factor is
   non-zero for at least one player by round 30 (a regression check over
   the sessions of section 3.6, which the engine bead re-records at its
   identity).

## 12. Implementation beads

| #   | Bead               | Scope                                                                                                                                                                                                    | Validation profile                    | Depends on            |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------- |
| 1   | `pulp_wars-kaw6.1` | This spec.                                                                                                                                                                                               | `docs/tracker`                        | —                     |
| 2   | `pulp_wars-kaw6.2` | Engine: sections 3, 4, 5 and 9: score ledger and query, `gameMode` with Perfection end and ranking, grade at match end, persistence, legacy default, headless and `play:text`, identity bump, tests 1–6. | `ai/map/persistence`                  | 1, `pulp_wars-w49.28` |
| 3   | `pulp_wars-kaw6.3` | Leaderboard and end of match: section 8 (score column, breakdown, Perfection rounds, final scores and the winner by score), desktop and phone.                                                           | `ui/presentation` (+ `smoke:browser`) | 2                     |
| 4   | `pulp_wars-kaw6.4` | New-game screen and records: sections 6 and 7 (mode toggle, tribe grid with stars and glow, records store, grade shown and recorded at the end), test 7–8; smoke starts a Perfection match.              | `ui/presentation` (+ `smoke:browser`) | 2                     |

Beads 3 and 4 touch different parts of `app-view-v7.ts` and can follow
bead 2 in either order. The AI head start (`pulp_wars-w49.7`) is not a
dependency; when it lands it updates `HARDEST_AI_DIFFICULTY_V7` (section
5.5).

## 13. Open questions for the user

1. **The mode's name.** "Perfection" is Polytopia's name. Keep it, or our
   own (for example "Glory" or "Thirty Rounds")? **Default:** "Perfection"
   until you name it.
2. **"Hardest difficulty" while only Normal exists.** **Default:** Normal
   counts as the hardest, so 3 stars need the rating and (in Domination)
   every elimination; when the AI head start (`w49.7`) lands, 3 stars need
   its largest setting and stars earned before stay. Alternatives: treat
   Cooperative mode, or at least two rivals, as the hard setup until then.
3. **Score under fog.** **Default:** every player's total is visible in
   the leaderboard (like the city and unit counts today), the breakdown
   only your own until the end. Alternative: hide the totals of players
   you have never seen.
4. **Flawless.** **Default:** no unit died, was disbanded, or was taken,
   and no city lost; damage is allowed; the 2-star rating is required.
   Should damage also break it, or the rating not be required?
5. **Thresholds.** **Default:** 1.5 / 2.0 with three or more rivals, 1.75
   / 2.5 with two, 2.0 / 3.0 with one. Revisit after you have played a few
   games of each mode.
6. **Army as a factor.** You listed kills, damage taken, achievements,
   cities, and territory "etc."; the spec adds Army (the units you have)
   and Technology. **Default:** both in.
7. **Two "modes" on one screen.** **Default:** the AI select's label
   "Mode" (Rival / Cooperative) becomes "Alliances".

## Appendix A. Draft, critique, and changes

### A.1 Draft 1

Draft 1 had seven factors with linear weights and no cap: Territory 2 per
tile, Cities 10 per level, Technology 10 per tier, Achievements 40, Kills 4
per Coin of victim, Losses −2 per Coin, Damage −0.25 per HP; no Army. Its
stars were absolute, from the score per settlement of the board (`score ÷
S`, section 2.2 of the current rules) at the end of the match: 1 star a
win, 2 stars 40 points per settlement, 3 stars 60 and the hardest
difficulty and every elimination by you; flawless meant no unit lost and
gave 3 stars and the glow; "hardest difficulty" was left undefined;
Perfection ended "after turn 30" without a stated moment or tie rule.

### A.2 Critique (as a skeptical designer)

- **C1. The loser outscores the winner.** At round 30 of the small game
  the author, who had just lost the capital and a city (3 cities against
  5, 7 units against 24), led 553 to 469 on Kills alone (45% of the
  author's points): killing 30 cheap Zombies outweighed losing the war.
  **Change:** Kills 2 per Coin, Losses −1 per Coin, and a new Army factor
  (1 per Coin of the units you have), so strength in hand counts and a
  kill swings 4 points per Coin between the two players, not 6. The
  Undead now lead 521 to 433.
- **C2. Negative scores.** The crushed Candy AI of Large II scored −46: a
  negative number in a leaderboard reads as a bug and lets penalties
  dominate (−71% and −46% of its positive points). **Change:** the
  penalty cap, at most half of the positive points; it acted once in the
  31 rows of appendix B.
- **C3. Territory and Cities count the same thing.** Without Land Grants
  territory is exactly 9 tiles per city, so the two factors are one. They
  stay separate because you asked for both and they do diverge: Cities
  measures growth (levels) and Territory expansion (count and Land
  Grants). **Kept**, with Territory at 18 points per city, less than the
  levels of a grown city add up to: together they are 47–71% of a
  player's points at round 10, when there is little else to count, 37–62%
  at round 20, and 21–59% at round 30.
- **C4. Score per settlement can be bought.** On a big board with few
  players each player has more villages to take, more rounds to grow, and
  weaker relative rivals; an absolute "points per settlement" threshold
  rewards exactly the gigantic map you excluded, and it depends on the AI's
  strength, which is not the player's achievement. **Change:** the rating
  is relative to the best rival on the same board.
- **C5. The grind and the dead rival.** Measured at the end, a rival
  eliminated in round 50 has a final score near zero and a 60-round grind
  has the largest final score of all: the longest games would have the
  best ratings. **Change:** each rival's peak, and the rating moment no
  later than round 30.
- **C6. One rival is the easy way to 3 stars.** With one rival, every
  capture adds to you and subtracts from your only rival, and "every
  elimination by you" is automatic. **Change:** thresholds that rise as
  rivals fall (section 5.2).
- **C7. The pacifist glow.** In Perfection on a 25 x 25 board you can
  avoid every rival for 30 rounds, lose nothing, and be "flawless"
  without outplaying anyone. **Change:** flawless needs the 2-star rating;
  disbanding a unit counts as losing it (otherwise disbanding every unit
  about to die would keep the flag).
- **C8. Last-turn dumping.** Any scored purchase invites spending
  everything in round 30. Accepted: Army, Technology, and growth all pay
  about 1 point per Coin (section 3.5), so no single dump is decisive and
  spending well is still the skill.
- **C9. Damage double-counts deaths, and the accounting has many
  sources.** A dying unit counts its value and its HP. Accepted: Losses
  weigh what was lost, Damage the attrition of the units that lived (a
  Fighter's 12 HP is −2, its value −2). Counting damage event by event
  would need every damage source of eight factions listed and kept in
  step; the per-command HP difference is exact and catches all of them,
  at the price of netting a heal in the same command (small and
  symmetric).
- **C10. The score leaks hidden information.** A rival's total moves when
  it researches or fights out of sight. Ruled acceptable (section 3.4):
  the leaderboard already shows every player's cities and units under fog,
  and a total names no tile, unit, or technology. Open question 3.
- **C11. "Hardest difficulty" does not exist.** Leaving it undefined
  makes 3 stars untestable. **Change:** Normal is the hardest today, with
  the head start as the future lever (section 5.5); the rating already
  makes stars harder against stronger rivals.
- **C12. Diminishing returns.** The bead asked for a cap or diminishing
  return on every factor; square roots were considered (Territory 30√tiles,
  Cities 40√levels, Kills 25√value) and rejected: the leaderboard
  breakdown becomes unreadable and a conqueror with three times the land
  gets 1.7 times the points. The natural limits of section 3.1 do the job:
  Technology and Achievements are bounded, Army is bounded by unit slots,
  levels cost quadratically more population, the penalty is capped, and
  the rating ignores everything after round 30.
- **C13. Technology props up a collapse.** The author's two-city remnant
  in Large II had 42% of its points from Technology. Accepted: research is
  permanent progress, and the remnant still ranks fourth of five, half of
  the leaders.
- **C14. Achievements are lumpy.** None is earned by round 10 on a 20 x 20
  board. Accepted: they are milestones; at 40 points the one to three
  achievements players held at round 30 were 5–17% of their points.
- **C15. "Mode" twice on one screen.** The AI select is labelled "Mode".
  **Change:** the setup field is `gameMode`, the new control "Game mode",
  and the AI select becomes "Alliances" (open question 7).
- **C16. Perfection's end and ties were vague.** **Change:** the round end
  of round 30 (no neutral turn, no round 31), a full tie-break chain, and
  no draw.

### A.3 What the redraft changed

Weights (Kills 4 → 2, Losses −2 → −1, Damage −0.25 → −0.2 per HP,
Technology 10 → 8 per tier), the new Army factor, the
penalty cap, the relative rating with rival peaks and the round-30 rating
moment, thresholds by rival count, the flawless definition (disband, the
2-star rating), Normal as the hardest difficulty with the head start as
the lever, the exact Perfection end and tie-break, and the setup naming.

### A.4 Ideas weighed and rejected

- **Polytopia's formula and its difficulty bonus.** The user asked for the
  concept, not the algorithm.
- **A speed bonus in Domination.** The rating already compares you with
  your rivals at the same moment; a faster win against equally weak
  rivals is not a better game, and a bonus per unplayed round would make
  the 1-rival rush the best farm.
- **Stars from AI-versus-AI statistics** (for example "beat the average
  Normal AI score by 2 deviations"): forbidden by the user's rule, and it
  would move with every AI change.
- **Score on unspent Coins.** Hoarding is not progress.
- **A star for a lost game with a high score.** "1 star is basically
  winning".

## Appendix B. Calibration data

Points per factor (section 3.1) for every player of the games of section
3.6 at the round ends of rounds 10, 15 (Large I), 20, and 30; "Largest
share" is the largest positive factor's share of the player's positive
points; "Cap" is what the penalty cap gave back.

**Small: 11 x 11 Dry Land, seed 21, Human (author) against the Undead AI.**

| Round | Seat        | Territory | Cities | Technology | Achievements | Army | Kills | Losses | Damage | Cap | **Score** | Largest share  |
| ----: | ----------- | --------: | -----: | ---------: | -----------: | ---: | ----: | -----: | -----: | --: | --------: | -------------- |
|    10 | Human (you) |        90 |     90 |         40 |           40 |   22 |    20 |     −2 |     −9 |     |   **291** | Territory 30%  |
|    10 | Undead AI   |        54 |     50 |         40 |           40 |   11 |     4 |    −10 |    −10 |     |   **179** | Territory 27%  |
|    20 | Human (you) |        90 |    130 |        112 |           40 |   38 |    70 |    −16 |    −33 |     |   **431** | Cities 27%     |
|    20 | Undead AI   |        54 |     70 |        112 |           40 |   31 |    32 |    −35 |    −45 |     |   **259** | Technology 33% |
|    30 | Human (you) |        54 |     80 |        184 |           40 |   27 |   164 |    −44 |    −72 |     |   **433** | Technology 34% |
|    30 | Undead AI   |        90 |    150 |        176 |          120 |   77 |    88 |    −82 |    −98 |     |   **521** | Technology 25% |

**Large I: 20 x 20 Dry Land, seed 33, Human (author) against Goblin,
Dinosaur, Martian, and Ice Folk AIs (abandoned after round 15).**

| Round | Seat        | Territory | Cities | Technology | Achievements | Army | Kills | Losses | Damage | Cap | **Score** | Largest share  |
| ----: | ----------- | --------: | -----: | ---------: | -----------: | ---: | ----: | -----: | -----: | --: | --------: | -------------- |
|    10 | Human (you) |        54 |     50 |         56 |            0 |    8 |     0 |     −6 |     −6 |     |   **156** | Technology 33% |
|    10 | Goblin AI   |        54 |     40 |         32 |            0 |   19 |     4 |     −3 |     −3 |     |   **143** | Territory 36%  |
|    10 | Dinosaur AI |        72 |     60 |         32 |            0 |   17 |     4 |    −12 |    −11 |     |   **162** | Territory 39%  |
|    10 | Martian AI  |        36 |     30 |         32 |            0 |   16 |    20 |      0 |      0 |     |   **134** | Territory 27%  |
|    10 | Ice Folk AI |        90 |     80 |         40 |            0 |   29 |    14 |      0 |     −2 |     |   **251** | Territory 36%  |
|    15 | Human (you) |        36 |     50 |         56 |            0 |    6 |    12 |    −12 |    −10 |     |   **138** | Technology 35% |
|    15 | Goblin AI   |        90 |     60 |         40 |            0 |   28 |    54 |     −9 |    −11 |     |   **252** | Territory 33%  |
|    15 | Dinosaur AI |        54 |     50 |         32 |            0 |   21 |    24 |    −32 |    −33 |     |   **116** | Territory 30%  |
|    15 | Martian AI  |        36 |     30 |         56 |            0 |   13 |    44 |    −10 |     −6 |     |   **163** | Technology 31% |
|    15 | Ice Folk AI |       126 |    130 |         56 |           40 |   36 |    38 |    −23 |    −19 |     |   **384** | Cities 31%     |

**Large II: 20 x 20 Dry Land, seed 44, Human (author) against Goblin,
Dinosaur, Martian, and Candy AIs.**

| Round | Seat        | Territory | Cities | Technology | Achievements | Army | Kills | Losses | Damage | Cap | **Score** | Largest share  |
| ----: | ----------- | --------: | -----: | ---------: | -----------: | ---: | ----: | -----: | -----: | --: | --------: | -------------- |
|    10 | Human (you) |        72 |     90 |         40 |            0 |   18 |    12 |     −8 |     −7 |     |   **217** | Cities 39%     |
|    10 | Goblin AI   |        54 |     50 |         48 |            0 |    7 |    16 |     −6 |     −6 |     |   **163** | Territory 31%  |
|    10 | Dinosaur AI |        36 |     40 |         40 |            0 |   12 |     0 |      0 |      0 |     |   **128** | Cities 31%     |
|    10 | Martian AI  |        36 |     30 |         48 |            0 |   16 |    10 |      0 |     −1 |     |   **139** | Technology 34% |
|    10 | Candy AI    |        72 |     50 |         32 |            0 |   18 |     0 |     −5 |     −4 |     |   **163** | Territory 42%  |
|    20 | Human (you) |        90 |    160 |        128 |           40 |   30 |    38 |    −18 |    −18 |     |   **450** | Cities 33%     |
|    20 | Goblin AI   |        90 |    120 |         80 |            0 |   28 |    22 |    −19 |    −20 |     |   **301** | Cities 35%     |
|    20 | Dinosaur AI |       108 |    100 |         80 |            0 |   45 |    12 |     −6 |    −10 |     |   **329** | Territory 31%  |
|    20 | Martian AI  |        54 |     80 |         80 |            0 |   31 |    60 |     −3 |     −5 |     |   **297** | Cities 26%     |
|    20 | Candy AI    |        90 |    110 |         80 |            0 |   16 |    24 |    −32 |    −34 |     |   **254** | Cities 34%     |
|    30 | Human (you) |        36 |     60 |        200 |           80 |   10 |    92 |    −64 |    −51 |     |   **363** | Technology 42% |
|    30 | Goblin AI   |       144 |    310 |        152 |           40 |   48 |   144 |    −71 |    −69 |     |   **698** | Cities 37%     |
|    30 | Dinosaur AI |       180 |    330 |        120 |           40 |  127 |    62 |    −31 |    −48 |     |   **780** | Cities 38%     |
|    30 | Martian AI  |        72 |    180 |        216 |           80 |   82 |   188 |    −10 |    −11 |     |   **797** | Technology 26% |
|    30 | Candy AI    |        36 |     70 |         80 |            0 |    4 |    36 |    −98 |   −102 |  87 |   **113** | Technology 35% |

Ratings that the games give at the rounds above, if the match had been
decided there (section 5.1, peaks from the five-round snapshots): the
small game's author 1.63 (R10), 1.46 (R15), 1.66 (R20), 0.83 (R30); the
Undead 1.12 at R30; the Ice Folk AI in Large I 1.55 (R10) and 1.52 (R15);
Large II's author 1.33 (R10), 1.48 (R15), 1.37 (R20), 0.46 (R30), and its
leading Martian AI 1.02 at R30.
