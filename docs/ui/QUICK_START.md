# Quick Start: New-Game Defaults

Beads `pulp_wars-2yc.54` (quick start) and `pulp_wars-2yc.65` (styled
pickers). A developer note: none of the numbers or formulas below appear in
the game. The player sees only the result (the map and its size under the
quick choices, and the values pre-filled under Advanced settings). Every
number is a first guess, meant to be tuned. The code is
`src/render/quick-start-v7.ts` (pure, unit-tested in
`tests/unit/quick-start-v7.test.ts`).

## The screen

New game asks, in order:

1. **Game mode** (Domination or Perfection), remembered per browser as before.
2. **Your tribe** (the tribe grid).
3. **Opponents**, 1 to 8, a row of buttons.
4. **Difficulty**: Normal, Hard, Harder, Brutal, a row of buttons,
   remembered per browser (`pulpWars.ruleset7.quickStart.difficulty.v1`).
   Its tooltip says only that harder levels give the AI players more
   starting Coins.

Under them one line names the map and its size ("Continents · 11 × 11").
Then **Advanced settings** (closed by default, open or closed for the page
session) and **Play**.

Advanced settings hold every other option, pre-filled with what the quick
choices picked: Players (Alliances, AI head start), Map (Map, Size, the
village and Crowded line, the map's sentence, Curiosities, New map / Use
seed) and Factions (each opponent's faction). Editing one overrides the
quick default:

- **Size** set by hand stays as set (it still moves to the nearest legal
  size, with the "Size changed" note, when the opponents or the map make it
  illegal). Until then the size follows the map and the opponents, silently.
- **AI head start** set by hand stays as set until the Difficulty is
  changed, which sets it again from the difficulty.
- **Map**, **Alliances**, **Curiosities**, the seed and the opponents'
  factions are simply what the fields hold.

The quick defaults are fixed when a new game is prepared: when the page
opens and after every game started from this screen. Starting a game
unpins Size and AI head start, draws new opponents and moves the map cycle
on.

## Defaults that are not asked

- **Alliances**: Free-for-all.
- **Curiosities**: on.
- **Map seed**: a new random map.
- **Opponents' factions**: every faction but the player's, in a random
  order (`randomOpponentFactionsV7`, a Fisher-Yates shuffle). Seat 1 plays
  the first of them, and so on; picking an opponent's tribe in the grid
  moves that opponent to a free one, as before. Tests inject the draw
  (`randomDraw`; `() => 0` keeps the registration order).
- **Map**: the cycle **Continents → Lakes → Pangea → Continents…**, one step
  per game started. A first visit starts on Continents (the long-standing
  default). The last map of the cycle started is remembered per browser
  (`pulpWars.ruleset7.quickStart.lastMap.v1`), and in the page when storage
  is blocked. A game started on another map (chosen under Advanced) does not
  move the cycle.

## Board size

For the map type and the players (`opponents + 1`), among the sizes the
engine allows (`allowedBoardSizesV7`) and **at most 20 × 20** (performance;
25 × 25 stays available under Advanced), take the smallest size that

- gives every player at least **L** land tiles (`landTileCountV7(size) /
players ≥ L`), and
- is not Crowded (`crowdedBoardV7`);

otherwise the largest allowed size up to 20 × 20.

| Map type   | L (land tiles per player) |
| ---------- | ------------------------- |
| Pangea     | 35                        |
| Continents | 28                        |
| Lakes      | 35                        |
| Other      | 35                        |

Continents asks for 28 so that one opponent keeps the long-standing
11 × 11 board (56 land tiles since the natural water of `7r87`,
`pulp_wars-ykw.8`; it asked 34 of 68 before, and 28 of 56 picks the same
size for every count of opponents: the wider sea is crossed by boat, not
lost room). With today's land counts this gives:

| Opponents  | 1       | 2       | 3       | 4       | 5       | 6 to 8  |
| ---------- | ------- | ------- | ------- | ------- | ------- | ------- |
| Continents | 11 × 11 | 14 × 14 | 16 × 16 | 20 × 20 | 20 × 20 | 20 × 20 |
| Lakes      | 11 × 11 | 14 × 14 | 14 × 14 | 16 × 16 | 20 × 20 | 20 × 20 |
| Pangea     | 11 × 11 | 14 × 14 | 16 × 16 | 16 × 16 | 20 × 20 | 20 × 20 |

## Difficulty: the AI head start

Difficulty is the AI head start only, for now. Normal is the game as
balanced: no head start (the AI cannot be made weaker without a rule
change, so there is no level below it). Each harder level has a base head
start, scaled by how much land each player has, because a head start counts
for more where players meet early:

```text
raw   = base × (land tiles / players) / 40   (33 on Continents)
coins = the offered amount (5, 10 or 20) nearest to raw by ratio,
        never below 5; Normal is always 0
```

| Difficulty | Base (Coins at 40 land tiles per player) |
| ---------- | ---------------------------------------- |
| Normal     | 0                                        |
| Hard       | 5                                        |
| Harder     | 10                                       |
| Brutal     | 20                                       |

"Nearest by ratio" means the amount whose ratio to `raw` is closest to 1
(the boundaries are about 7.1 between 5 and 10 and about 14.1 between 10
and 20). The result never decreases with the difficulty or with the land
per player.

The Continents reference is 33, the 40 scaled to its 46% land since `7r87`
(56% before), so every Continents board keeps the head start it had.

On the quick boards (25 to 55 land tiles per player, 20 to 37 on
Continents) this is +5, +10 and +20 almost everywhere; seven or eight
opponents on Continents 20 × 20 (20 to 23 land tiles each) get +5, +5 and
+10. A board chosen larger under Advanced
raises it: one opponent on Pangea 20 × 20 (144 land tiles each) is +20 even
on Hard. The Showcase never has a head start.

## Pickers (`pulp_wars-2yc.65`)

The menus (new game, campaign briefing, Settings on the front screens and in
a match) have no native dropdown. Each choice is a picker
(`src/render/dom/picker-v7.ts`) over a hidden `<select>` that keeps the
value, so form code and tests still read and set `select.value` and hear
`change`:

- **List**: a button in the Control recipe (`role="combobox"`, the current
  value and a caret) that opens a list under it (`role="listbox"`), above it
  when there is no room below. Focus stays on the button; the active option
  is its `aria-activedescendant`. Arrow keys, Home, End, Page Up/Down and a
  first letter move; Enter or Space picks; Escape closes (a closed picker
  leaves Escape to the screen); Tab moves on and closes; a press outside
  closes. Disabled options are skipped and refused. Options are 44 CSS px
  tall and the list scrolls inside itself, at most 22rem wide and never
  wider than the window.
- **Segmented**: a framed row of buttons, the chosen one pressed
  (`aria-pressed`), for short lists: Opponents, Difficulty, Alliances,
  Motion and Animation speed.

Which list is open is kept per document, so a redraw (the match's Settings
are reconciled in place) draws it open again.
