# Multi-cell terrain at the fog's edge

**Bead:** `pulp_wars-2yc.28`. The user, 2026-10-07: "terrain sprites that are
more than 1 tile long appear wrong when not the entire sprite is visible
(explored). fix it".

A mountain massif ([COMPOSED_TERRAIN.md](COMPOSED_TERRAIN.md)) and a composed
forest ([COMPOSED_FORESTS.md](COMPOSED_FORESTS.md), in every faction's skin:
[FACTION_FORESTS.md](FACTION_FORESTS.md)) are drawn as pieces that span
several cells. This is how they are drawn where only some of those cells are
explored. Presentation only, in the CHIBI art set: no rule, number, save or
identity changed, and the view the game gives the interface is unchanged.

## What was wrong

Found in screenshots of a range and a wood half inside the fog
(`scripts/art/terrain-fog/review.ts partial`):

| Fault                                    | What was seen                                                                                                                                                                                                                                       | Cause                                                                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| The piece changed when more was explored | A single mountain at the fog's edge became half a ridge, a low mountain a tall one whose peaks cover the row behind, and a clump of trees a quarter of a larger piece, a step after it was first seen. A whole row of ridges could shift by a cell. | The cover was packed from the explored cells alone, so every newly explored cell re-packed its neighbours (and, for a massif, its whole row). |
| Art over the fog                         | Tree tops (24 px) and low peaks (13 px) of a cell stood on the unexplored cell behind it, as loose tips in the cloud.                                                                                                                               | The band above a piece is drawn in the foreground, after the fog, whatever lies behind the cell.                                              |
| A straight cut                           | Along a wood or a range the fog ended on the cell's edge, a ruler line, while along Grass and water it ended in the cloud's scallops.                                                                                                               | The cloud's edge is drawn in the ground pass; trees and rock are drawn after it and covered it.                                               |
| (Task 2 of the bead) A clearing's trees  | A Forest cell with a Treasure, a curiosity, a Grave, a Field Defense or a building kept the default pines inside a faction's wood. See [FACTION_FORESTS.md](FACTION_FORESTS.md#on-the-board).                                                       | A clearing drew the Forest master's single clump, whoever owned it.                                                                           |

## What is drawn now

1. **The cover is the whole map's.** The pieces are packed over the explored
   cells as they are and the unexplored cells as the map was made (the
   **ghosts**, below). So a cell at the fog's edge draws its share of the
   piece it will have when everything is explored: half a ridge, the lower
   part of a tall mountain, one cell of a 2 x 2 wood. Exploring a cell
   changes nothing in the cells already seen.
2. **Only the explored share is painted.** Every piece, seam clump, band
   and snow cap goes through one function (`blitShareV7`), which draws it
   whole where no cell under it is fog and otherwise inside a clip of the
   cells under it that are not fog. Nothing is ever painted on an
   unexplored cell. A single clump's or mountain's overflow (the fallback
   art, and a clearing of the default Forest) is left out over fog too.
3. **The cloud's edge covers the cut.** For a Forest or Mountain cell
   beside the fog, the cloud's edge is drawn a second time after the trees
   and the rock, and still under every unit, building and road marker of
   the foreground. The cut is under the scallops and the feather.

A band of tree tops is drawn only for columns whose own cell is explored,
and never over fog. So the tips of a hidden row of trees appear over the
explored row behind them only when their own row is explored: a change
within 24 px of the old fog's edge, where the cloud was.

### The ghosts

[`terrain-at-fog-v7.ts`](../../src/render/canvas/terrain-at-fog-v7.ts).

- **The skeleton** is the Forest and Mountain cells of the map as it was
  made. It comes from the match's own setup, which is in the view: a map
  is a pure function of its setup (`createInitialMapStateV7`, the same call
  the game makes at launch, once per match, 25 to 180 ms for the largest
  map). A mission's and the Showcase's authored map likewise. The engine
  and the view are unchanged.
- **A ghost** is an unexplored cell that the skeleton has as Forest or
  Mountain. The board host adds a plan's ghosts to it (`plan.ghosts`); they
  are never entries, and only the packing of forests and massifs reads
  them. A ghost Forest takes the territory of the explored ground beside
  it where the view shows no border between them, so a faction's wood that
  runs into the fog is packed as one wood.
- **A ghost's turn.** A piece is drawn at its last cell's turn, a seam
  clump at its west or south cell's. Where that cell is a ghost, its turn
  is its `FOG` entry's place in the plan, so the order of the draws is the
  order of the whole map, and each is clipped to the explored cells.
- **A skeleton that does not fit is not used.** A state built by hand over
  another map (a test, an art review) fails the check (nine in ten explored
  cells must have the skeleton's ground) and is drawn without ghosts. The
  reviews of this bead give the host their own skeleton.

### The Rift

Bead `pulp_wars-2yc.37`. The designer: "there is a problem with terrain
sprites that take up more than on tile but are partially hidden. like the
rift 3x1. If when only 1 tile is explored out of the 3, the wrong part of
the sprite is displayed."

A Rift is one crack per orientation cut into three 80 x 80 pieces (west,
middle, east; north, middle, south). The piece of a cell was chosen from
the explored cells alone (`riftPieceV7`), with an unexplored neighbour
taken as "the crack runs on". So a lone end was drawn as a middle, a lone
cell of a vertical Rift as a horizontal middle, and the piece changed when
the next cell was explored.

Now the skeleton also holds the map's Rift cells, and the board plan reads
an unexplored neighbour from it (`buildBoardRenderPlanV7`'s
`terrainSkeleton` option, given by the board host in both art sets). A
Rift never changes (RULESET_7_RIFT.md section 2), so each explored cell
shows the third it shows when all three are explored, in every one of the
seven ways one, two or three cells can be explored, and exploring another
cell changes nothing. The pieces are single cells, so nothing is clipped
and nothing is painted on an unexplored cell.

What it tells: an end piece, or a middle, says in which direction the
other two cells lie. That is the same kind of knowledge as half a ridge:
the ground of the map as it was made, one or two cells behind the cloud's
edge; and a Rift is always three cells long, so its being there was known
already.

Without a skeleton (`?fog-terrain=0`, a state built by hand) the piece is
still guessed from the explored cells. The guess now ends the crack on a
side where other ground is seen, where it used to draw a middle.

### Every kind of art that spans or overhangs cells

Audited for bead `pulp_wars-2yc.37`: is each explored cell's share the one
it has when everything is explored?

| Kind                                                                                             | How it is drawn at the fog                                                               | Right in every mask?                                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rift, both orientations                                                                          | Six single-cell pieces; the piece from the skeleton                                      | Yes, since this bead                                                                                                                                                |
| Mountain massifs: 2-cell ridges, single mountains, tall pieces 48 px over the row behind         | Packed over the explored cells and the ghosts; `blitShareV7` clips to the explored cells | Yes, but for a hidden cell with a feature (below)                                                                                                                   |
| Mined mountain (80 x 104)                                                                        | A single cell; its band through `blitShareV7`                                            | Yes                                                                                                                                                                 |
| Composed forests: 1 x 2 up to 2 x 2 pieces, seam clumps, bands of tree tops                      | The same as massifs                                                                      | Yes, but for a hidden clearing (below)                                                                                                                              |
| The six faction forests                                                                          | The same; a ghost takes its faction from the explored ground beside it                   | Yes, but for a wood more than two cells into the fog or behind a border the view does not show                                                                      |
| Snow caps on trees and peaks (Ice Folk)                                                          | Cell by cell through `blitShareV7`                                                       | Yes                                                                                                                                                                 |
| Single clump or mountain (fallback art, a clearing): 24 px above its cell                        | Its overflow is left out over fog                                                        | Yes                                                                                                                                                                 |
| Snow, sea ice, coast sand and surf, the water blend, faction grass spill, mountain fringe        | Art inside one cell whose edges depend on the neighbours, read from explored cells only  | Not a share of a larger sprite. An edge toward the fog is redrawn when the neighbour is explored, within 20 px of where the cloud's edge was                        |
| Roads                                                                                            | Drawn inside their own cell, toward explored Road cells                                  | The same: a stub appears when the next Road cell is explored                                                                                                        |
| LEGACY Farm pairs (two cells, one raster cropped in halves)                                      | Paired from the explored Farms                                                           | No, and left so: a Farm is built in play, so a hidden partner cannot be read. A Farm beside the fog is a whole single Farm until then. CHIBI Farms are single cells |
| Cities, villages, buildings, curiosities (Lair, Fountain, Shrine, Wreck...), units, Dwarf mounds | One cell each; up to 24 px above the cell, drawn whole over the cloud                    | Yes: they stand on an explored cell and are not cut. No curiosity or building spans two cells                                                                       |

### What a ghost can tell

Where a piece runs on into the fog, the cell behind the cloud's edge is
Forest or Mountain **as the map was made**. That is the kind of ground of
one cell, a step before a unit would see it; the half of a ridge that shows
is mostly under the cloud's edge. It never tells what happened there since
(a Mine, a Lumber Camp, a cleared wood), what resource, site, treasure or
unit is there, or who owns it: a ghost is the skeleton's, not the game's,
and the test changes every hidden tile and gets the same ghosts.

To draw without ghosts, open the game with `?fog-terrain=0` (or set
`TERRAIN_AT_FOG_ENABLED_V7` to `false`). The pieces are then packed from the
explored cells alone, as before, and change as cells are explored; points 2
and 3 above stay.

### When a cell still changes

- A hidden cell that is no longer what the map was made with (a wood
  cleared or a Mine dug under the fog), or that holds a feature the packing
  gives a clearing or a single mountain (Ore that the viewer can see, a
  Treasure, a curiosity, a Grave, a building): its neighbours are re-packed
  when it is explored, as before. Measured on three generated maps under
  random sights (bead `pulp_wars-2yc.37`): none of 1294 explored Mountain
  cells before the viewer can see Ore; once it can (Drill), 37 of the 317
  that have a hidden Mountain beside them. No Forest cell of 1425 either
  way. Reading the hidden Ore would end it and would tell, by a single
  mountain where half a ridge would be, where Ore lies under the fog; that
  is a decision for the designer.
- A faction's wood whose hidden part lies more than two cells into the fog,
  or behind a border the view does not show.
- The edge decorations between two cells (the coast's sand and surf, the
  shelf between the waters, a faction's grass spilling over a border)
  appear when both cells are known. They lie within 20 px of the shared
  edge, where the cloud's edge was. They are not drawn from ghosts: sand
  showing under the cloud would give away water.

## Review

```sh
npx vite --port 6823 --strictPort &
CHROME_PATH=... TERRAIN_FOG_URL=http://localhost:6823/ \
  npx tsx scripts/art/terrain-fog/review.ts partial <out-dir>   # the cuts, far and near, every skin
CHROME_PATH=... npx tsx scripts/art/terrain-fog/review.ts stable <out-dir>
npx tsx scripts/art/terrain-fog/diff.ts <cut>.png <cut>-explored.png <diff.png>
```

`review.ts rift <out-dir>` writes a Rift in each orientation with each of
the seven explored subsets of its cells, with the skeleton and (`-before`)
without, and a ridge and a wood cut the same way, with labelled sheets.

`stable` writes, for each cut, the board half in the fog and the same board
with the same camera after the rest is explored. `diff.ts` with
`TERRAIN_FOG_DIFF_FOG=<cut>.json` leaves out the cells that were fog and
24 px round them and counts the pixels that differ in the rest. At a whole
zoom there are none but the stars' twinkle. At a fractional zoom the edge
pixels of a clipped piece differ by a shade (the browser resamples a
clipped draw a little differently); the pieces are the same.

`TERRAIN_FOG_QUERY=fog-terrain=0` draws any set without ghosts.

## Known limits

- **Half a ridge is half a ridge.** At the cut the rock runs into the
  cloud; the scallops are 6 px deep on average, so a careful eye can tell a
  ridge that goes on from a mountain that ends.
- **The roads of a Forest or Mountain cell beside the fog** end under the
  second cloud edge, where they used to lie over it.
- **The first frame of a match** makes the skeleton before it draws.
- The LEGACY art set and the classic look draw single cells and are
  unchanged.
