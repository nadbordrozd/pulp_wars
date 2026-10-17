# UI review, October 2026

Bead `pulp_wars-2yc.76`. The user, 2026-10-17: "do a review of the UI. what
could be streamlined? (maybe nothing). Where could we add extra visual cues
to make the game more legible and more fun?" This document is the review and
its proposals. It changes no code. Each proposal is meant to be small enough
for one bead.

**Benchmark.** Polytopia-like polish: every tap answers with a small motion,
every result is shown on the board where it happened, and the screen carries
little text. The house rules stay: the Newsstand style
([STYLE.md](STYLE.md)), targets picked on the board
([BOARD_TARGETING.md](BOARD_TARGETING.md)), minimal text and no coordinates
([SCREEN_FLOW.md](SCREEN_FLOW.md#no-coordinates-minimal-text-bead-pulp_wars-b5f8)),
the target marks never move or pulse, and every motion has a still under
the Motion setting.

**Covered elsewhere, not repeated here.** The fog tile tap (a smoky puff in
place of the square box on an unexplored tile) is bead `pulp_wars-2yc.77`.
The technology screen's tree shift and tap-outside-to-close are bead
`pulp_wars-2yc.78`.

## How it was looked at

- Desktop 1440 x 900 and phone 390 x 844, the dev build, headless Chrome
  started with `--mute-audio`, the game's Sound and Music stored off before
  the first gesture.
- The phone review script on hand-built fixtures
  (`scripts/browser-phone-review-v7.ts --sizes=p390,d1440 --report-only`):
  the menu, setup, tribe stars, HUD and coach, match menu, settings, city
  dock and recruit help, technology tree and detail, reward dialogs, the end
  of a match, leaderboard, Gallery, campaign, aiming (Kaboom!, Tunnel, Wail)
  and the tile-action badges and chooser.
- Played by hand, the human seat only: the Tutorial through its eight steps
  (one Goblin AI turn after End Turn), two quick-start matches for turn 1
  and one AI turn, and a hand-built Human vs Goblin arena (Fighter, Archer
  and Knight attacks and kills, a harvest that levels a city up). No AI
  self-play, no simulation, no play-text game.
- Frame bursts (a screenshot every 60 to 300 ms after a tap) for the attack,
  kill, capture, harvest and End Turn sequences.

## What already works

Most of the "juice" is there and should be kept as the reference for new
cues: Coins hop out of the tile and fly to the counter; population icons hop
to the city, which hops and fills its meter; a level-up ring precedes the
reward; a captured territory ripples row by row into the new faction's
ground; a win plays the victory wave; a unit hops when selected; fresh units
have the ready ring, ripple and bouncing chevron; many attacks have their own
shot (heat ray, firework, harpoon, pie); a Recover and a Troll's
regeneration float a "+N", a salvage or bounty its Coins; the enemy camera frames once and glides; the coach arrow hops.
Sounds exist for hits, deaths, training, research, captures, level-ups and
the turn start.

What is missing is mostly at the moment of **result**: a hit and a death
change the board between two frames, a new unit appears without an entrance,
and a newly explored area is a crossfade. Those are the highest-value gaps.

## 1. Streamlining

Short answer: the flows are already lean. The front menu, new game (quick
choices with Advanced closed), match menu and settings need nothing. The
proposals below remove a dead end or some noise; none adds a screen.

| ID  | What                                                                                                                                                                                                                                                                                                                | Where                             | Why it helps                                                                                                                                                                     | Size | Priority | Art / sound |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------- | ----------- |
| S1  | A tap on a plain tile that offers nothing (Grass, Forest, Water with no resource, no building, no action) opens no dock: the tile gives the same light tap cue as the fog puff of `2yc.77`, and the selection clears. After a tile action that leaves the tile empty (Harvest, Hunt, Fish), the selection goes too. | Board, tile dock                  | Today a harvested tile keeps the square box and a dock that says only "GRASS" ([02](ui-review-2026-10/02-empty-tile-dock.png)): one more close for nothing. Polytopia deselects. | S    | P1       | none        |
| S2  | Size the unit and tile dock to its content on desktop (as the compact card already is) and centre it, instead of a 1440 px plate with two buttons at its left end.                                                                                                                                                  | Dock, 1024 px and up              | The eye travels across an empty cream band; the card and the dock of one unit change shape when it has actions ([03](ui-review-2026-10/03-lethal-preview-and-dock.png)).         | S    | P2       | none        |
| S3  | Show the land trade line ("No trade: no Road or Port link to another of your cities") only when the player owns another city it could link to, and shorten it to "No trade link".                                                                                                                                   | City dock                         | Twelve words in every unlinked city once Commerce is known, the longest line of the dock ([07](ui-review-2026-10/07-city-dock-no-trade.png)).                                    | S    | P2       | none        |
| S4  | Dense badge fields: when one ability badges more than about twelve tiles (Star-fall, Tentacle), draw the badges as small pips and the full badge only on the hovered or focused tile and its neighbours. Needs the user's word: it softens the 2026-10-16 "an icon on every target tile" rule.                      | Board, tile actions               | A Stargazer covers the board in about thirty identical badges, over its Moves and its own units ([04](ui-review-2026-10/04-badge-field-phone.png)).                              | M    | P2       | none        |
| S5  | Disband and Wait as small secondary buttons at the end of the action row (icon over a short name, a step lighter), so a unit's real abilities lead.                                                                                                                                                                 | Unit dock                         | Disband, which cannot be undone, has the same weight and place as Kaboom! or Beam Down; on most units the row is "Disband, Wait" and nothing else.                               | S    | P3       | none        |
| S6  | Reward dialog: drop "Choose a reward to continue." (the heading line already says "Pick a reward").                                                                                                                                                                                                                 | Level-up and giant reward dialogs | Minimal text; the line repeats the subtitle.                                                                                                                                     | S    | P3       | none        |
| S7  | Achievement notice as a large toast with the deed and the monument line that goes by itself (or at the next tap on the board), not a dialog with Continue.                                                                                                                                                          | Achievement notice                | One more tap in the middle of play; it is news, not a choice. A city reward stays a dialog because it is a choice.                                                               | S    | P3       | none        |
| S8  | The tutorial's objective chip ("Capture every enemy city.") and its step plate are both yellow; give the objective chip the plain Chip recipe while the tutorial runs.                                                                                                                                              | HUD, tutorial                     | Two yellow plates compete for the "do this now" meaning that the Hint recipe owns.                                                                                               | S    | P3       | none        |

## 2. Visual cues

Every cue below is presentation only: the state has changed already, nothing
waits for it and no input is held; Fast halves it, Fast Forward skips it,
and Reduced motion shows one still frame (or nothing that travels). None
names a tile coordinate. None animates a target mark.

### Results: what just happened

| ID  | What                                                                                                                                                                                                                                                                         | Where                                    | Why it helps                                                                                                                                                                     | Size | Priority | Art / sound                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------- | ------------------------------------------------- |
| V1  | **Damage numbers.** At each hit a red "−6" in the board label face pops over the unit that took it (attacker's retaliation too, splash, eruption, Plague), rises about half a tile and fades (about 700 ms). The Recover's "+N" float is the model; the Thump's "−2" exists. | Board, every attack, own and enemy turns | Today a hit is a 100 ms flash and shake; the HP bar is the only record, and a unit at full health has no bar before the hit. The player cannot read how hard the enemy hit back. | S    | P1       | none (existing hit sounds)                        |
| V2  | **Death poof.** A unit that dies flashes white, squashes and sinks while a small dust puff with two or three sparks bursts from its feet (about 400 ms); a dead flyer drops a little first. One recipe for every faction; an Egg keeps its own shell.                        | Board, every death                       | A killed unit simply disappears between two frames ([01](ui-review-2026-10/01-kill-without-feedback.png)). The kill is the biggest moment of a turn and the quietest.            | S    | P1       | none (`unit.death` exists)                        |
| V3  | **Spawn pop.** A trained or granted unit (Militia, Giant, Spoils) drops in from a few pixels above, lands with a small squash and a dust ring at its feet, and its ready ring draws itself.                                                                                  | Board, city center                       | A new unit just appears; with the dock closed it is easy to miss what was bought, and it is the moment the player spent Coins.                                                   | S    | P1       | none (`unit.train` exists)                        |
| V4  | **Fog lift.** When cells become explored, their cloud breaks into the same puffs as the `2yc.77` tap and drifts off over about 500 ms, the newly seen terrain fading in under it, nearest the unit first.                                                                    | Board, every reveal                      | Exploring is the reward of an early turn; today it is a 180 ms crossfade. This is the "smoking fog" the user described, applied where Polytopia applies it most.                 | M    | P1       | reuses the `2yc.77` puff; an optional soft whoosh |
| V5  | **Spend drop.** Coins paid (train, harvest, build, research) leave the HUD counter as a "−N" with a coin that drops and fades, the mirror of the coins that fly in.                                                                                                          | HUD                                      | Income is celebrated; spending is silent, so the counter just shrinks. The pair makes the economy legible at a glance.                                                           | S    | P2       | none                                              |
| V6  | **Capture flourish.** On a capture the city's name plate drops in with a bounce and a burst of confetti in the new owner's faction colour; the ripple already follows.                                                                                                       | Board, captures and new cities           | The toast "Kestrow founded" names it; the plate itself appears flat. Taking a city is the goal of the game.                                                                      | S    | P2       | none (`city.capture`, `village.capture` exist)    |
| V7  | **Research stamp.** In the tree the new technology's badge stamps from yellow to owned with a ring; back on the board, every tile and city that gained an action from it (each fruit after Gathering) sparkles once.                                                         | Technology screen, board                 | Research changes what can be done on the board, but nothing there says so; the player has to find the new actions.                                                               | M    | P2       | none (`research.complete` exists)                 |
| V8  | **Victory stars.** On the end screen the earned stars stamp in one after another and the score counts up to its value.                                                                                                                                                       | End of match                             | The stars are the reward of a match and appear all at once, static.                                                                                                              | S    | P2       | none (reward sounds exist)                        |

### Intent: what can I do, what will happen

| ID  | What                                                                                                                                                                                                                                                   | Where                 | Why it helps                                                                                                                                                                                               | Size | Priority | Art / sound |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------- | ----------- |
| V9  | **Lethal preview.** An attack label whose preview kills reads "KO" with a small skull ("Deal 3 · KO") on the loss red; one that kills the attacker on the strike-back says so the same way. The hovered target's HP bar shows the chunk it would lose. | Board, attack targets | Today a 3 HP Goblin under "Deal 3 · take 0" looks like any other target ([03](ui-review-2026-10/03-lethal-preview-and-dock.png)); "Advances" is the only hint. Polytopia shows the outcome before the tap. | S    | P1       | none        |
| V10 | **Nothing left glow.** When no own unit or city has a useful command left, End Turn takes the coach's soft pulse (still yellow ring under Reduced), every turn, not only the coach's first three.                                                      | HUD                   | The player scans the board for a ring to know they are done; Polytopia lights its End Turn button.                                                                                                         | S    | P2       | none        |
| V11 | **Move path.** Hovering or focusing a Move tile draws the path the unit will walk as small dots and a footprint at the end (a forest or road detour then shows).                                                                                       | Board, Move targets   | With 2 and 3 Move units the route is not obvious around forests, mountains and zones of control. A path is not a target mark, so the mark rule holds.                                                      | M    | P2       | none        |
| V12 | **Softer selection.** Replace the thick square selection box on a selected unit or city with corner ticks in cream (not brackets, which are the Attack mark) and let the unit's hop and ring carry the selection.                                      | Board                 | The same "inelegant square" the user named on the fog shows on every unit and tile ([01](ui-review-2026-10/01-kill-without-feedback.png)); after `2yc.77` it would be the last hard box on the board.      | S    | P2       | none        |
| V13 | **First-turn framing on desktop.** Open a new match framed on the explored area around the capital (the phone rule), not the whole board.                                                                                                              | Board, new match      | At 1440 x 900 the start is a small patch of land in a field of fog with a tiny capital ([05](ui-review-2026-10/05-first-turn-framing.png)); the player zooms in twice before the first tap.                | S    | P2       | none        |

### Life: make it feel alive

| ID  | What                                                                                                                                    | Where                | Why it helps                                                                                | Size | Priority | Art / sound |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------- | ---- | -------- | ----------- |
| V14 | **Idle breath.** The viewer's units that can still act breathe (one pixel up and down, slow, out of step with each other).              | Board, viewer's turn | The board is still between taps; the title scene's units already bob. It also says "ready". | S    | P3       | none        |
| V15 | **Dialog pop.** Dialogs and the reward cards scale in with a small overshoot; the chosen reward card flies to its city.                 | Dialogs              | Dialogs appear flat; one pop ties them to the pulp print style.                             | S    | P3       | none        |
| V16 | **Turn plate.** At the start of the viewer's turn a small plate "Turn 5" slides under the HUD for about a second, with the income chip. | HUD                  | After a long enemy turn it marks the hand-over; the HUD chip changes silently.              | S    | P3       | none        |

## 3. Recommended first batch

Eight small items, highest value first. Six are code-drawn effects on the
existing presentation steps and need no art and no new sound; together they
close the "moment of result" gap.

1. **V1 Damage numbers** (S, P1).
2. **V2 Death poof** (S, P1).
3. **V9 Lethal preview** (S, P1).
4. **S1 No dock for an empty tile, and none after a harvest** (S, P1); pairs
   with `2yc.77`.
5. **V3 Spawn pop** (S, P1).
6. **V4 Fog lift on reveal** (M, P1); after `2yc.77`, reusing its puff.
7. **V10 Nothing left glow on End Turn** (S, P2).
8. **S2 Desktop dock sized to content** (S, P2).

**Built: V1, V2 and V3** (bead `pulp_wars-2yc.80`,
`src/render/canvas/combat-juice-v7.ts`). One overlay layer with its own
clock; the playback never waits for it.

- **V1.** A red "−N" with an ink keyline and a hard offset shadow, 16 CSS
  px at least (30 world units at the camera's zoom). It pops in at 1.45x
  over the head, holds, and rises to just above the head as it fades,
  820 ms. The HP bar (at the base, or in the cell's left strip) stays
  clear. It floats on every hit the viewer sees: the target and the
  retaliation (110 ms later, on the attacker) when the blow or shot lands,
  a heat ray, the Siege Hammer, explosions, and every damage step (splash,
  Ricochet, Plague, Wail, a Gyrocopter's bomb, an eruption, a Whirl, a
  Stampede, Star-fall). A number its own cue already shows (the Thump, a
  giant's crush, stomp or trample) is not shown twice. Numbers asked for
  together on different tiles start 60 ms apart; a second number on one
  tile stacks above the first.
- **V2.** On the frame the dead unit leaves the board (the death sound's
  frame), its own sprite flashes white, squashes flat and sinks while a
  cream dust puff and three sparks burst from its feet, 460 ms; a flyer
  falls first. No poof for an Egg, a Shatter, a lost Brain, a digested,
  sacrificed or consumed unit, a sunk Tentacle, a Kaboom unit or an
  eliminated seat: each has its own cue or is not a fall in battle.
- **V3.** A trained or naval-trained unit, a city reward (the giant too)
  and a summoned daemon drop 18 master px onto their tile, squash on
  landing with a dust ring and two puffs, and settle, 440 ms; the board
  leaves the unit out until it lands. Eggs, hatchlings, the risen dead and
  an assembled Gunner keep their own cues. The ready ring is the board's,
  as before (it shows when the unit lands).
- Fast halves each cue (never below half while playback catches up); Fast
  Forward plays none. Reduced motion: a still number over the head
  (700 ms), a still dust cloud where the unit fell (340 ms) and a still
  dust ring under a new unit (300 ms), on timers, no animation frame.
- Review: `npx tsx scripts/browser-combat-juice-review-v7.ts
http://localhost:<port>/ --output-dir=<new-dir>` (dev server, muted
  headless Chrome, a stepped clock, no match played) writes frame sheets
  of a kill, a hit with its retaliation, training and an enemy Bomb
  Chucker's shot, at desktop and phone, full and reduced motion.

## 4. Later

V12 Softer selection, V13 first-turn framing, V5 spend drop, V7 research
stamp, V6 capture flourish, V8 victory stars, V11 move path, S3 the trade
line, S4 dense badge fields (needs the user's word), then the P3 items: S5,
S6, S7, S8, V14, V15, V16.

## 5. Notes by screen

- **Front menu, new game, campaign, settings.** Clean; nothing to cut.
  Setup's quick choices with Advanced closed are one screen and one Play.
- **HUD.** Coins, income, turn, Tech, menu, End Turn: lean. The recovery
  count on End Turn is a good cue. See S8, V5, V10, V16.
- **Selection and cards.** The unit card is compact and clear; the dock with
  actions is not (S2). A plain tile's dock is noise (S1).
- **Dock and tile badges.** The badges and the chooser read well at the
  usual counts (Hexer's Attack and Ribbit); a Stargazer's field does not
  (S4). Kaboom! shows "0 hit" on turn 1, which is honest; leave it.
- **Targeting.** The four marks are clear at both sizes. The attack label
  needs the kill (V9). Hover on desktop draws a dotted white cursor box over
  the target; fine.
- **Combat.** Lunges and the special shots are good; the hit and the death
  are the gap (V1, V2).
- **City growth.** Population hops, the level ring and the reward work; the
  reward dialog could pop (V15) and lose a line (S6).
- **Technology.** See `2yc.78`; V7 adds the payoff on the board.
- **End of turn and enemy playback.** "The Goblins are playing…" chip and
  Skip, the calm camera and the beat between units read well. Damage taken in
  the enemy turn needs V1 most of all: today the player finds out by looking
  for HP bars.
- **End screen.** Clear; the stars and score could land (V8).
- **Gallery.** Clean; the unit detail's Replay is a good touch. Nothing to
  cut.

## 6. Possible bugs seen

1. **The coach arrow covers a city's name plate** when it points at a tile
   just below the city ("Orro⬇ead",
   [06](ui-review-2026-10/06-coach-arrow-over-name.png)). The arrow should
   sit above the name plate or the plate should draw over it.
2. **The selection box jumps ahead of an advancing unit.** After a kill with
   a forced advance, the box is on the target's tile while the Knight is
   still walking there (middle frame of
   [01](ui-review-2026-10/01-kill-without-feedback.png)).
3. **An achievement notice opened over the attack that earned it**, hiding
   its playback behind the scrim. Seen once, in a hand-built arena whose map
   was all explored before the first command, so it may be an artefact of
   the fixture; worth checking with a real Explorer unlock (a level-up
   reward waits for its ring; the notice may not wait for the playback).

## 7. Decisions made

- Proposals that would soften a rule the user set (S4, the badge field) are
  listed with "needs the user's word" rather than ranked into the first
  batch.
- The fog lift (V4) is placed after `2yc.77` so that one puff recipe serves
  both the tap and the reveal.
- No proposal pulses or moves a target mark; motion goes on units, plates and
  effects.

## Evidence

Annotated screenshots, compressed, in
[`ui-review-2026-10/`](ui-review-2026-10/):

- `01-kill-without-feedback.png`: a Knight kills a 3 HP Goblin; three frames.
- `02-empty-tile-dock.png`: after a harvest, the box and a "GRASS" dock.
- `03-lethal-preview-and-dock.png`: a lethal attack label, and the desktop
  dock.
- `04-badge-field-phone.png`: a Stargazer's Star-fall badges at 390 px.
- `05-first-turn-framing.png`: turn 1 of a quick start at 1440 x 900.
- `06-coach-arrow-over-name.png`: the coach arrow over a city name.
- `07-city-dock-no-trade.png`: the land trade line in a city dock.
