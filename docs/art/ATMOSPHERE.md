# The atmosphere: water's edge, fog of war, night sky

**Bead:** `pulp_wars-2yc.17`. The user, 2026-10-06:

1. "make the boundary between shallow water and deep water less sharp. could
   be a gradient or could be a more irregular boundary or both."
2. "make the fog of war look nicer too."
3. "make a nicer starry parallax background outside of the map."

Three changes to the live look of the CHIBI art set, each drawn by code (no
raster, nothing to preload) and each behind its own switch. Presentation
only: no rule, number, save or identity changed. The classic look and the
LEGACY art set are unchanged.

## Turning them off

| Look                    | Open the game with                     | Or, for everyone, set                                                                                 |
| ----------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| The edge between waters | `?water-blend=0` (also `off`, `false`) | `WATER_BLEND_STYLE_V7` to `"OFF"` in [`water-blend-v7.ts`](../../src/render/canvas/water-blend-v7.ts) |
| The cloud fog of war    | `?fog-style=0`                         | `FOG_STYLE_ENABLED_V7` to `false` in [`fog-of-war-v7.ts`](../../src/render/canvas/fog-of-war-v7.ts)   |
| The night sky           | `?starfield=0`                         | `STARFIELD_ENABLED_V7` to `false` in [`starfield-v7.ts`](../../src/render/canvas/starfield-v7.ts)     |

`=1` forces a switch on. With a switch off the board host creates nothing
for that look and the board is drawn exactly as before. The switches
combine with each other and with `?coast-sand`, `?faction-grass` and
`?city-shadow`.

`?water-blend=gradient`, `?water-blend=contour` and `?water-blend=both`
draw the three variants of the water's edge that were tried and not chosen.
`?fog-style=<name>` draws the cloud in another of its
[palettes](#the-palettes).

## The edge between shallow and deep water

[`water-blend-v7.ts`](../../src/render/canvas/water-blend-v7.ts). A water
cell with water of the other depth beside it, or at a corner, draws the
other depth's own tile over its ground through a mask.

- **The contour** between the two waters wanders up to about 6 px to either
  side of the cells' edge.
- **The shelf**: on the shallow side of the contour lies a band about 7 px
  wide, of uneven width, where the water is half way between the two
  depths. The depth changes in two soft steps.

More than a quarter of a cell from the edge a cell is exactly its own
tile, so Shallow and Deep still read at a glance.

It is drawn in the ground pass straight after the cell's tile, so sea ice,
the shoreline's sand and surf, resources, Ports and units are all on top.

**No seam, no repeat.** The mask is cut from one distance field (the
distance to the nearest neighbouring cell of the other depth, corners
included), and the contour is a sum of three waves over board pixels with
a period of three cells. Two cells therefore agree along their shared edge
and a long edge does not repeat cell by cell. The mask is in the art's own
80 px cell, so it is the same at every zoom.

**No fog leak.** A cell's mask depends only on which of its eight
neighbours are explored water of the other depth. An unexplored neighbour
has no depth.

### The variants

| Variant                | What it is                                           | Verdict                                                                                                                                                |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A `gradient`           | Straight edge, a smooth gradient 30 px wide          | Rejected. The cells stay squares, now out of focus; the only blurred thing on a board of flat tones.                                                   |
| B `contour`            | Wandering edge, hard                                 | Close. In the board's style and clearly not a grid, but still a sharp line, which is what the user asked to lose.                                      |
| C `both`               | Wandering edge with a smooth gradient 22 px wide     | Rejected. Reads as a smudge beside the crisp pixel art, and the deep water's wave marks fade in and out along it.                                      |
| D `shelf` (**in use**) | Wandering edge with a half-depth band on its outside | Chosen. It is both things the user named, drawn the way the art direction shades everything else: two or three flat tones, minimal gradients, no blur. |

## The fog of war

[`fog-of-war-v7.ts`](../../src/render/canvas/fog-of-war-v7.ts). Unexplored
ground is a bank of cloud instead of flat dark squares with a grid.

- **The cloud**: every unexplored cell is filled with one continuous
  texture, mist with round puffs, in the colours of a
  [palette](#the-palettes). A puff has a pale rim at its
  bottom left and a shaded rim and a short cast shadow at its top right:
  the sun is in the south-west. The texture repeats every seven cells and
  has no cell grid.
- **The wisps**: a faint second layer of long pale streaks that drifts
  slowly to the right (3 px a second in art pixels).
- **The edge**: every cell beside the fog draws the cloud's edge over its
  own ground: round lobes that reach up to about 10 px out of the fog with a thin
  pale rim, then a feather of mist 8 px wide. The empty sky round the map
  gets the same edge. It is drawn in the ground pass, after the shoreline,
  so Roads, buildings and units are on top of it and never lose their
  outline to the fog. Over a Forest or Mountain cell it is drawn a second
  time after the trees and the rock (bead `pulp_wars-2yc.28`,
  [TERRAIN_AT_THE_FOG.md](TERRAIN_AT_THE_FOG.md)), so a wood or a range
  that runs into the fog ends under the cloud and not on a ruler line.

The cloud is low in contrast on purpose: its lightest and darkest tones
are closer together than the tones of any terrain tile, so the edge of the
known world, with its rim and the feather's shade on the ground, is the
strongest line it draws.

### The palettes

Bead `pulp_wars-2yc.28`. The user, 2026-10-07: "change the color of the fog
of war. this one is ugly." The cloud's shapes, light and motion are the
same in every palette; only its colours change. `FOG_PALETTES_V7` in
[`fog-of-war-v7.ts`](../../src/render/canvas/fog-of-war-v7.ts);
`FOG_DEFAULT_PALETTE_V7` is the one in use.

| `?fog-style=`       | What it is                                                                     | Verdict                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dusk` (**in use**) | Lavender-violet dusk clouds with pale lilac rims.                              | Chosen. It is the night sky round the map lifted into cloud, so the fog and the sky read as one world; it has a colour of its own that no terrain, water or faction ground uses; and the land is still the brightest thing on screen. |
| `cumulus`           | Pale cream cumulus with lilac shade; the edge casts a soft shadow on the land. | The runner-up, and the most storybook. At the start of a match nearly the whole map is fog, and then the brightest thing on the screen is the part with nothing in it, beside a dark interface.                                       |
| `parchment`         | Warm sepia, the blank of an old map, with an inked edge.                       | Reads as land: it is close to the coast's sand and to the Goblin ground.                                                                                                                                                              |
| `midnight`          | Deep teal-navy that melts into the starfield.                                  | Elegant, and the map's edge disappears; but it is dark again, which is what was called ugly.                                                                                                                                          |
| `plum`              | A muted plum.                                                                  | Dull beside the bright board, and close to the Undead owner colour.                                                                                                                                                                   |
| `slate`             | The slate blue-grey of bead `pulp_wars-2yc.17`.                                | The old one, kept to compare.                                                                                                                                                                                                         |

`?fog-style=0` is still the flat dark fog of before bead
`pulp_wars-2yc.17`; `?fog-style=1` and an unknown name are the palette in
use. Every palette keeps the light in the south-west (a puff's lit rim is
lighter than the puff, its shaded rim darker, its cast shadow darkest), a
rim at the cloud's edge that stands off the cloud, and a feather that only
ever darkens the ground beside it; the tests hold each palette to that.

**It never shows anything hidden.** The board plan has no terrain, unit,
city or resource for an unexplored cell, only a `FOG` entry with its place.
The fog reads an entry's kind and place and nothing else; the texture is a
function of board pixels; the fill is opaque; and a cell's edge depends
only on which of its eight neighbours are unexplored. (The pieces of a wood
or a range that runs into the fog are another matter:
[TERRAIN_AT_THE_FOG.md](TERRAIN_AT_THE_FOG.md).)

**Motion.** The wisps move with a clock the board host advances only on
frames it draws anyway, by at most 50 ms a frame. The fog never asks for a
frame of its own (an idle board stays idle) and never jumps after a pause.
For reduced motion the clock is 0 and the wisps are still.

**Cost.** One path of at most one rectangle a row of fog, filled twice
with a canvas pattern (the texture, the wisps), where the old fog filled
and stroked every cell. The edge is one cached 80 px surface a cell beside
the fog; at most 320 are kept (about 8 MB), the least recently used going
first as the frontier moves. A canvas without patterns gets a flat fill.

## The night sky

[`starfield-v7.ts`](../../src/render/canvas/starfield-v7.ts). The canvas
behind the board is a night sky instead of a flat dark green.

- **The sky** is a deep navy with three wide, faint tints of nebula
  (violet, teal, rose). They are painted once for a canvas size, at an
  eighth of the size, and stretched.
- **Three layers of stars**, 110, 60 and 22 to a tile of 960 x 720 px, one
  to two pixels across. A layer moves by 3%, 7% and 13% of the camera's
  pan and spreads by 4%, 9% and 16% of a change of zoom, so the board
  floats in front of the sky.
- **Seven bright stars** in the nearest layer have a four-point glint and
  twinkle slowly (still for reduced motion; the same clock as the fog).

The sky is a function of the camera and the clock only and reads nothing
of the game. It is dark and sparse so that the map's edge tiles keep their
contrast: the brightest star is a few pixels across and the nebula's
tints are faint.

## Review

```sh
npx vite --port 6751 --strictPort &
CHROME_PATH=... SWITCH_GAME_URL=http://localhost:6751/ SWITCH_PARAMETER=fog-style \
  npx tsx scripts/art/look-switch-review.ts scripts/art/atmosphere/review-scenes.ts <out-dir>
```

`SWITCH_PARAMETER` is `water-blend`, `fog-style` or `starfield`. The
palettes side by side: `npx tsx scripts/art/terrain-fog/review.ts palettes
<out-dir>` (see [TERRAIN_AT_THE_FOG.md](TERRAIN_AT_THE_FOG.md#review)).
`SWITCH_AFTER_VALUE=gradient` (with `water-blend`) draws a variant on the
"after" side, and `SWITCH_FIXED_QUERY='fog-style=0&starfield=0'` holds the
other looks off on both sides. The scenes are generated Archipelago and
Continents starts, with the map's edge and both waters in view, and a
25 x 25 map.

## Known limits

- **The title scene, the Gallery and the tile dock** draw their own
  backgrounds and tiles and use none of this.
- **The wisps stop at the fog's cells**: the cloud's edge over explored
  ground is a still picture. The wisps are faint (13% at most), so the
  join does not show.
- **The fog only drifts while the board is being redrawn** for another
  reason (a unit ready to move, an animation, a pan). On a board with
  nothing to do it is still.
- **Explored cells at the map's edge** end in a straight line against the
  sky, as before; only the fog has a soft edge there.
- **The nebula does not move** with the camera; the stars do.
