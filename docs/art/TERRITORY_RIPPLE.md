# The territory ripple

**Bead:** `pulp_wars-2yc.28`. The user, 2026-10-07: "whenever you take over a
city/village and the terrain changes to your faction make all the changing
tiles do a little jump animation - one by one. jump and change into the new
skin."

And, the same day: "when a faction takes over a city and the surroundings
change skin i want all terrain tiles to do a little jump as they change.
make them jump one in rows, not all at once."

When the territory of explored cells changes owner (a city or a village
taken, a Land Grant, a border that moves), those cells change one after
another, **row by row**: the top row from left to right, then the next
row, down the territory. Each springs up a few pixels and takes its new
look at the top: the faction's grass and trees, Snow, the coast, the
faction look of a building and of the city itself. Never all at once, and
never a whole row at once. (The first version rippled outward from the
city's centre; the user asked for rows.)

Presentation only. The game's state has changed already when the ripple
starts; nothing waits for it and no input is held. The capture's sound is
the one the presentation already plays, once: the ripple makes none.

## Turning it off

| To                          | Do                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Look at the game without it | Open it with `?tile-hop=0` (also `off`, `false`). `?tile-hop=1` forces it on.                                         |
| Switch it off for everyone  | Set `TERRAIN_RIPPLE_ENABLED_V7` to `false` in [`terrain-ripple-v7.ts`](../../src/render/canvas/terrain-ripple-v7.ts). |
| Play without motion         | The system's reduced-motion setting or the game's Motion setting: every cell changes at once, with no hop.            |

## The ripple

`TERRAIN_RIPPLE_V7` in
[`terrain-ripple-v7.ts`](../../src/render/canvas/terrain-ripple-v7.ts).

- **Which cells:** every cell explored before and after whose territory
  has another owner (or none) than in the view before: Grass, Forest,
  Mountain, water, with whatever is built on it. A cell explored only now
  was not seen to change and does not hop. A Human player's new land hops
  too, although Human territory looks like no one's: the hop is the
  feedback, and the border line is already drawn.
- **Order:** by city, in reading order: the top row of the changing cells
  from left to right, then the next row, down to the last. The same every
  time. Two cities that change at once change side by side.
- **Timing:** 55 ms from one cell to the next; a hop is 220 ms. A 3 x 3
  city's last cell starts after 0.44 s and has landed at 0.66 s. For more
  than 17 cells the step shrinks so that the starts fit in 0.9 s (a 5 x 5
  city: 37 ms, done in 1.12 s; 49 cells: 19 ms), so any change is done
  within 1.2 s, and two cells never start together.
- **The hop:** the cell's ground, and what is built or grows on it, is
  stretched upward from the cell's foot by up to 7 px of an 80 px cell
  (whole device pixels): fast up with an ease-out for 40% of the hop, then
  down. The foot stays on the ground, so no gap opens under a cell. A unit
  standing on the cell does not move, nor do its bars, badges, ready cue
  and promotion marker. A city does not move either: its own hop, name
  plate, pips, crown and garrison belong to the feedback animations
  (bead `pulp_wars-2yc.29`), and the two never pull at it together. The
  city takes its new look, and its name plate its new colour, at the top
  of its cell's hop. A forest
  piece hops at its last cell's turn.
- **The swap:** until the top of its hop a cell shows the plan entries it
  had before (its terrain entry, its improvement's and its city's); from
  the top it shows the game's own.

A second change that arrives in the middle (a border that grows while a
capture still ripples) starts its own ripple over its own cells. A cell
still waiting keeps the look it is showing and takes its place in the new
ripple; no cell changes back.

## How it is built

- **The clock** is the atmosphere's (`#atmosphereClockMs` in
  [`board-host-v7.ts`](../../src/render/canvas/board-host-v7.ts)): it
  advances only with drawn frames, by at most 50 ms a frame, so a ripple
  never skips after a pause. While a cell is still to change the host asks
  for the next frame itself (`#pumpTerrainRipple`); an idle board stays
  idle.
- **`observe`** is called with every view about to be drawn. A view with a
  higher command index than the last one seen starts a ripple; an older or
  equal one (the "before" of a presentation's crossfade) is ignored, so a
  crossfade does not start it twice. Another match forgets everything.
- **`plan`** gives the board the game's plan with the waiting cells' old
  entries put back. It is the same object while the same cells wait, so
  the packing of forests and the other per-plan caches are rebuilt once a
  swap, not once a frame; no raster is rebuilt.
- **`hops`** gives the board the cells in the air. The board draws the
  entries of `TILE_HOP_KINDS_V7` at such a cell under a vertical stretch
  about the cell's foot: one `save`, `scale` and `restore` an entry.

For the other board animations: the hooks in the shared files are
`tileHops` (an input of `drawBoardV7`), the `lifted` block at the top of
the entry loop in `board-renderer-v7.ts`, and in `board-host-v7.ts` the
three lines in `renderView` (`observe`, `plan`, `hops`), `#pumpTerrainRipple`
after it, and `pinTerrainRipple` for reviews. Units, cities' own effects and
the HUD are not touched.

## Cost

Measured in headless Chrome on the review's machine, drawing time of one
frame (`scripts/art/terrain-fog/review.ts ripple`, `*.cost.json`):

| Board                                         | Still board      | During the change |
| --------------------------------------------- | ---------------- | ----------------- |
| 14 x 14, 80 px cells, 49 cells changing       | 3.8 ms (max 15)  | 5.7 ms (max 11)   |
| 25 x 25, whole map in view, 25 cells changing | 12.4 ms (max 19) | 15.5 ms (max 31)  |

Two to three milliseconds a frame, for about a second.

## Review

```sh
npx vite --port 6823 --strictPort &
CHROME_PATH=... TERRAIN_FOG_URL=http://localhost:6823/ \
  npx tsx scripts/art/terrain-fog/review.ts ripple <out-dir>
```

Writes a 3 x 3 city's capture held every 50 ms (`city-0000.png` on, the
strip `city-strip.png`), a 7 x 7 territory's held every 100 ms
(`capture-strip.png`), and the cost of a frame on the 14 x 14 scene and on
a 25 x 25 map.

## Known limits

- **A wood changes in pieces.** A forest piece covers up to four cells, and
  the pieces are packed again as each cell changes sets, so in the middle
  of a ripple the trees of a cell can change twice.
- **A cell off the screen** changes in its turn without being seen.
- **The LEGACY art set** has no faction skins; its cells hop and only the
  owner tint changes.
