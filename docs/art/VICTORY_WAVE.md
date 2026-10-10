# The victory wave

**Bead:** `pulp_wars-556y`. The user, 2026-10-09: "when you win the game I
want an animation of all the tiles jumping and taking your faction skin. All
tiles even outside of any city borders. Even if humans win do it."

When the viewer wins, a wave runs out from the viewer's capital over the
whole explored board. Every land cell, in borders or not, hops and takes the
winner's faction skin at the top of its hop. The board then stays in that
skin behind the Victory dialog. Presentation only: no rule, number, save or
identity changes.

## When it plays

| Result                                              | What the board does                             |
| --------------------------------------------------- | ----------------------------------------------- |
| The viewer wins by elimination (Domination)         | The wave, then the dialog                       |
| The viewer wins a Perfection match by the score     | The wave, then the dialog                       |
| A Showcase or mission win                           | The same: it is a win                           |
| A defeat (by elimination or by the score)           | Nothing new: the dialog at once, as before      |
| A won match loaded from a save                      | The skin at once, no wave, the dialog at once   |
| Reduced motion (the system's or the Motion setting) | A 450 ms crossfade to the skin, then the dialog |

`victoryWaveTriggerV7` in
[`victory-wave-v7.ts`](../../src/render/canvas/victory-wave-v7.ts) decides:
the view's outcome is a `VICTORY` whose winner is the viewer.

## Turning it off

| To                          | Do                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Look at the game without it | Open it with `?victory-wave=0` (also `off`, `false`). `?victory-wave=1` forces it on.                           |
| Switch it off for everyone  | Set `VICTORY_WAVE_ENABLED_V7` to `false` in [`victory-wave-v7.ts`](../../src/render/canvas/victory-wave-v7.ts). |

With it off the board keeps its look and the dialog shows at once.

## The wave

`VICTORY_WAVE_V7` holds every number.

- **Where it starts:** the winner's capital; when the capital is lost, the
  city the winner captured last; else any of the winner's cities; else the
  middle of the board.
- **Rings:** a cell's ring is its distance from the start, rounded. The cells
  of one ring hop together, so the wave is a widening circle. 75 ms from one
  ring to the next, shrunk so that the starts fit in 1.5 s: a 25 x 25 board
  from a corner (34 rings) has landed in about 2 s.
- **The hop** (520 ms): the cell crouches (a little wider, never lower,
  since a lower cell would open a gap above it), springs up 11 px of an 80 px
  cell (18 px for a Human win), falls, lands wide and bounces once a little.
  It swaps to the skin at the top. Like the [territory ripple](TERRITORY_RIPPLE.md), the cell is
  stretched up from its foot (its ground, Roads, resources, buildings and
  trees), so no gap opens under it.
- **A ring of light:** from the top of its hop each cell, water too, glows
  under a soft round wash that flares and fades over 420 ms (screen
  blending, kept on the board). The glows of neighbouring cells melt into a
  band that sweeps the board with the wave. It is the winner's faction
  colour at 22% for every faction whose ground changes, and gold at 60% for
  a Human win.
- **Water** does not hop. Two thin pale rings widen on each water cell as
  the wave passes, and the water keeps its look: no faction has a water skin.
- **Units and cities** stay where they are, drawn as ever. A city keeps its
  owner's look and its name plate; units do not bob, so no unit drifts off
  its cell.
- **The fog** stays as it is: an unexplored cell is not part of the wave.

## The skin

`victoryTerrainSkinV7` gives a land cell the members the board plan gives a
cell inside the winner's territory, from the same helpers:

| Winner    | Grass and the Mountain fringe                        | Forest               |
| --------- | ---------------------------------------------------- | -------------------- |
| Humans    | The default Grass                                    | The default Forest   |
| Undead    | The ashen ground (`territoryGround`)                 | The dead wood        |
| Goblins   | Scrubland                                            | Scrub                |
| Dinosaurs | Jungle floor                                         | Jungle               |
| Martians  | Red dust                                             | Alien growths        |
| Dwarves   | Stony moor                                           | Pines among boulders |
| Candy     | Sugar meadow                                         | The candy grove      |
| Ice Folk  | Snow on every land cell (edges cut at water and fog) | The tundra forest    |

Water and the Rift are never skinned. Another faction's Snow is cleared,
except where a Blizzard still blows. Buildings keep the look of their
territory's owner, and borders, Roads and units are unchanged.

**A Human win** is the default look, so the skin alone would change only the
other factions' land. The root review (2026-10-09) found the first version,
small sparkles alone, barely read. Now a Human win has:

- the strong gold ring of light above;
- a taller hop (18 px);
- three golden sparkles per cell at the top of its hop. Each is a tapered
  four-pointed star with a dark outline, a white heart and a warm halo, up
  to 24 px of an 80 px cell, flaring and drifting up over 760 ms. They are
  drawn over everything.

With reduced motion a Human win's crossfade is washed in gold (at most 45%,
strongest halfway), so the change shows there too.

## The dialog

The Victory dialog (and an achievement notice of the winning command) waits
while the wave plays and shows 350 ms after the last cell lands. It never
waits longer than 9 s. Any click, tap or key brings it at once (the tap only
skips the wait and does not reach the board). Its buttons are never covered.
With reduced motion it waits for the 450 ms crossfade only.

## How it is built

- `createVictoryWaveV7()` keeps the state. The board host (`#draw` in
  [`board-host-v7.ts`](../../src/render/canvas/board-host-v7.ts)) observes
  the game's view, never a presentation's. The wave runs on a clock of its
  own that advances (at most 50 ms a frame, like the atmosphere's) only
  with frames that draw the game's view. So when the winning command's
  presentation plays first, the wave waits for it and is seen whole.
- `plan` gives the board the plan with the cells passed so far skinned. It
  is the same object while the same rings have changed, so the per-plan
  caches (forest packing, faction grass, coast) are rebuilt once a ring, not
  once a frame. Once it has landed the skinned plan is cached per plan.
- `hops` adds the land cells in the air to the board's `tileHops` (with
  their own `height` and `widen`), and `frame` gives the water rings, the
  glows and the sparkles. `drawBoardV7` draws the rings over the ground and
  Roads (under trees and pieces), then the glows and the sparkles last.
- The crossfade draws the skinned board whole on a canvas of its own and
  lays it over the old one, so units and cities never fade.
- The host tells the app when the wave has landed
  (`setVictoryWaveListener`). `victoryWaveAnimates` says whether a win would
  play one at all, and the app waits only then.

## Cost

Measured with `review.ts` on the 25 x 25 map of eight seats, every cell
explored, in headless Chrome without a GPU on a laptop (2026-10-10).
Drawing time of one frame at 1440 x 900:

| Board                         | Mean   | 95th percentile |
| ----------------------------- | ------ | --------------- |
| Still, before the win         | 5.6 ms | 6.9 ms          |
| During the wave (every 16 ms) | 6.1 ms | 11.8 ms         |
| In the skin, after the wave   | 4.5 ms | 5.7 ms          |

The wave adds about 0.5 ms a frame, well inside a 16.7 ms frame. Each glow is one cached sprite per colour,
stamped, not a gradient built per cell (that cost 5 ms).

## Review

```sh
npx vite --port 6255 --strictPort &
CHROME_PATH=... VICTORY_WAVE_URL=http://localhost:6255/ \
  npx tsx scripts/art/victory-wave/review.ts <out-dir>
```

Hand-built states (`scripts/art/victory-wave/review-scenes.ts`, no move
played): a Human win by the score beside the Undead's land, a Martian and a
Candy win by elimination, each at 1440 x 900 and 390 x 844; and at
1440 x 900 an Undead, a Goblin, a Dinosaur and a Dwarf win by elimination
and an Ice Folk win by the score. `VICTORY_WAVE_SHOTS=human-desktop,...`
takes only the named shots. For each it
writes the board before the win, the wave held at 120, 360, 600, 840 and
1100 ms, the dialog, the board after it, and a strip of them all. It also
writes the reduced-motion crossfade at 0, 225 and 440 ms of the Martian and
the Human win (`reduced-*`, `reduced-human-*`), and `cost.json`.

## Known limits

- **A cell off the screen** changes in its turn without being seen.
- **A Human win on a phone** is a dense shower of sparkles for about a
  second, while every ring in view sparkles at once. The
  camera does not move.
- **A wood changes in pieces**, as in the territory ripple: a forest piece
  spans up to four cells, which can sit in two rings.
- **The LEGACY art set and the classic look** have no faction skins: their
  cells hop and glow (and a Human win sparkles), but the look does not
  change.
- **The fog is not skinned.** An unexplored cell has no terrain in the view.
