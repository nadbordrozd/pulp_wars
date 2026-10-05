# The shoreline

**Bead:** `pulp_wars-2yc.5`. The user, 2026-10-05: "make a nicer boundary
between water and land. you could draw a thin irregular line of sand."

In the live look of the CHIBI art set every edge between land and water has
a thin, wavering band of sand and a little surf. Presentation only: no
rule, number, save or identity changed. The classic look and the LEGACY art
set are unchanged.

## Turning it off

| To                          | Do                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Look at the game without it | Open it with `?coast-sand=0` (also `off`, `false`). `?coast-sand=1` forces it on.                         |
| Switch it off for everyone  | Set `COAST_SAND_ENABLED_V7` to `false` in [`coast-sand-v7.ts`](../../src/render/canvas/coast-sand-v7.ts). |

With the switch off the board host creates no coast art and the board is
drawn exactly as before.

## What is drawn

Everything is drawn by code in
[`coast-sand-v7.ts`](../../src/render/canvas/coast-sand-v7.ts); there is no
raster and nothing to preload.

- **A land cell** (Grass of any faction, Forest, Mountain, a Rift) with
  water beside it or at a corner draws **sand**: a band about 4 px wide
  that swells to 9 px, thins and breaks here and there. It has a slightly
  greyer wet edge at the water and a darker lip, one pixel wide, where the
  land begins.
- **A water cell** (Shallow or Deep) with land beside it draws the
  **waterline**: the sand runs up to 3 px out into the water, unevenly, so
  the shore is not the cell's straight edge; then a faint pale line of
  surf, and a few foam flecks 3 to 6 px out.
- **Sea ice** keeps its own edge: a water cell under ice draws no
  waterline. The land beside it keeps its sand.

It is drawn in the ground pass, after the cell's ground, the faction grass
and the Snow overlay, and under Roads, resources, Ports and other
buildings, trees, peaks and units. A Forest at the coast shows the sand
between its trunks; a Mountain shows it at the foot of its rocky ground.

**Corners.** Both layers are cut from one distance field: the distance to
the nearest neighbouring cell of the other kind, the four diagonal ones
included. The band therefore runs round an outer corner and fills an inner
one without a joint, and land that touches water only at a corner gets a
small quarter-round of sand.

**No repeat, no step.** The band's width is a sum of three waves over board
pixels with a period of three cells, so the bands of two cells meet without
a step and a long straight coast does not repeat cell by cell.

**Deterministic, and no fog leak.** A cell's layer depends only on which of
its eight neighbours are explored land or water and on its coordinates.
An unexplored neighbour is neither, so the coast appears as the map is
explored and shows nothing the player has not seen.

**Light.** The sun is at the bottom left (the user, 2026-10-05). The sand
is flat; its only shading is the darker lip on the land side.

## Review

```sh
npx vite --port 6593 --strictPort &
CHROME_PATH=... npx tsx scripts/art/look-switch-review.ts scripts/art/coast-sand/review-scenes.ts <out-dir>
```

Before and after pairs on generated Continents and Archipelago starts for
the Humans, the Martians, the Ice Folk (with sea ice beside the capital)
and Candy, each with a Port on the coast.

## Known limits

- **The title scene** draws its own coast (a column of sea beside the
  diorama) with its own code and does not use this module.
- **The Gallery's terrain tab and the tile dock** show tiles one at a time
  and have no coast.
- **Sand has one colour** on every ground. On Snow it is drawn over the
  snow, as a warm line; on Candy mint and Martian dust it reads as a pale
  rim.
- A Port or a Shipyard covers the sand of its own cell's edge.
