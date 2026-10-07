# Composed forests

**Bead:** `pulp_wars-maw.3` (epic `pulp_wars-maw`). The user approved the
design on 2026-10-04 after before/after screenshots, with two conditions: the
forest must keep the softer, background look of the old Forest sprite, and
there must be a few more piece variants.

Mountains use the same packing and drawing for ranges: see
[COMPOSED_TERRAIN.md](COMPOSED_TERRAIN.md).

In the CHIBI art set a group of Forest cells is drawn as one forest. Before,
every Forest cell drew its own clump of trees, so a wood read as a grid of
clumps. The LEGACY art set is unchanged. No rule and no map generation
changed.

## What a Forest cell draws

Every explored Forest cell that still shows its canopy takes part. A Forest
under a Lumber Camp, Windmill, Sawmill or Forge is drawn as Grass, as before,
and does not.

| Layer                | Pass         | What                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ground               | `GROUND`     | The Forest master's ground tile, as before: Grass, or the gloam Grass inside Undead borders.                                                                                                                                                                                                                                       |
| Shade                | `GROUND`     | A dark green veil, about an eighth opaque, cut back with the Mountain fringe mask along edges that face a cell without Forest. Snow and the Blizzard go over it.                                                                                                                                                                   |
| Seam clumps          | `TALL_BODY`  | One single clump on the east edge and one over the north edge of a cell, where the neighbour is another piece. They are drawn first, so they only show through the gaps between two pieces. They are the softened clumps of the piece set.                                                                                         |
| Piece footprint      | `TALL_BODY`  | The multi-tile piece, drawn once at its last cell's turn, after the Roads and under every unit and building.                                                                                                                                                                                                                       |
| Glade                | `FOREGROUND` | On a cell with a resource: a small round opening of the cell's own ground (snowy on Snow) over the trees and under the animal, centred on the cell. The ground is fully open out to 17 px from the centre and fades out evenly to nothing at 29 px, so it has no hard line and stays inside its cell. See [The glade](#the-glade). |
| Band                 | `FOREGROUND` | The piece's 24 px band above its top row, in that row's turn, exactly where the old clump's overflow was drawn.                                                                                                                                                                                                                    |
| Snow caps (Ice Folk) | both         | The caps of each tree raster, drawn cell by cell over Snow cells only; a piece that spans a Snow border is capped only on its Snow side.                                                                                                                                                                                           |

A cell with a Village, a City, a Treasure, a curiosity, a Grave, a Field
Defense or an improvement is a **clearing**: it keeps the single clump it
always drew, gains only the shade, and no piece or seam clump touches it.

While the piece set loads, or if it fails to load, every Forest cell draws
its single clump as before.

## The glade

`CHIBI_FOREST_GLADE_V7` and `chibiForestGladeAlphaV7` in
`src/render/canvas/chibi-forest-v7.ts`. The first glade (bead
`pulp_wars-maw.3`) was an irregular blob, one of four shapes, with a channel
running down to the cell's bottom edge so that no trunk stood under it. The
user (2026-10-06): "This background blob has a strange shape. it appears to
be elongated downwards. make it round or get rid of it." Bead
`pulp_wars-2yc.16` made it one round, soft-edged opening for every cell and
every forest set.

Both ways were tried in the real game, in the default Forest, the Candy grove
and the Undead dead wood (`scripts/art/resource-review.ts`):

- **No glade** (the animal straight over the trees, with or without a
  contact shadow): the Deer still reads in the default Forest, but the grey
  Boar and Rabbit are lost among the brown candy and the grey dead trees.
- **A round glade with a dithered hard edge**: round, but it reads as a disc
  stamped on the canopy.
- **A round glade that fades out** (chosen): reads as a small sunlit opening
  in every set, and the trees around it are never cut along a line. A
  smaller one (open to 12 px, gone at 24 px) left the Boar's back and snout
  over the trees; open to 17 px and gone at 29 px holds every Game animal.

The glade is alpha only: the ground's own colours, nothing mirrored, the same
for every cell, so it reads no coordinates and no state.

```sh
npx vite --port 6741 --strictPort &
CHROME_PATH=... npx tsx scripts/art/resource-review.ts <out-dir> [label]
```

The review mounts the real app view over the scenes of
`scripts/art/chibi/resource-review-scenes.ts`: a wood with Game whose west
half lies inside the viewer's widened borders (the faction's forest) and
whose east half is the default Forest, for the Humans, Candy, the Undead and
the Ice Folk, over a sea with Fish on shallow and (for the review only) deep
water.

## Packing

`src/render/canvas/chibi-forest-packing-v7.ts`. The board is cut into fixed
2 x 2 blocks aligned at even coordinates. The Forest cells of a block form a
4-bit mask, and the block's pieces are one exact cover of that mask by the
shapes 1x1, 2x1, 1x2, 2x2 and the four L-trominoes. The cover is chosen by a
hash of the block and the mask, weighted towards larger pieces; the variant of
each piece is a hash of its anchor cell.

- **Deterministic.** The choice reads coordinates and terrain only, so a map
  always draws the same forest.
- **Local.** A block reads only its own four cells. Clearing or planting one
  Forest cell re-picks at most that cell's block. Seam clumps and the shade
  read the four orthogonal neighbours, so the picture changes within one cell
  of the block and nowhere else.
- **At the fog** (bead `pulp_wars-2yc.28`,
  [TERRAIN_AT_THE_FOG.md](TERRAIN_AT_THE_FOG.md)). The plan has terrain
  entries for explored cells only. The board host adds the unexplored
  cells that the map was made with as Forest (the ghosts), so a block at
  the fog's edge is packed as it will be when it is all explored, and only
  the explored cells' share of a piece is painted. Exploring a cell then
  changes nothing in the cells already seen. Without ghosts
  (`?fog-terrain=0`, a board built by hand) a block is packed from its
  explored cells and exploring a cell is a local edit like any other.

The roles of a plan's cells are computed once per plan
(`chibiForestCellsV7`, cached in the renderer) and drawn by
`src/render/canvas/chibi-forest-v7.ts`.

## The piece set

`scripts/art/chibi-forest-pieces.ts` derives the pieces; no PixelLab call and
no hand drawing.

```sh
npm run art:chibi-forest-pieces -- bake     # write the masters and the manifest
npm run art:chibi-forest-pieces -- check    # re-derive and compare (also in art:validate)
npm run art:chibi-forest-pieces -- stats    # the softness figures below
npm run art:chibi-forest-pieces -- sheet <out.png>   # contact sheet, 1x and 3x
```

- **Sources.** The body layers of four accepted Forest clumps:
  `chibi-forest-1` and `-2` (batch 1), and `chibi-forest-4` and `-5` (batch
  `forest-clumps`, bead `pulp_wars-maw.3`, generated for this set).
- **Derivation.** Each piece is those clumps, mirrored or not, stamped at 1:1
  on a staggered lattice inside the piece's footprint and painted north to
  south, and then softened (see [Softness](#softness)). Nothing is resampled.
- **Outputs.** 20 piece masters in `public/assets/chibi/forest/`: three
  variants each of 1x1, 2x1, 1x2 and 2x2, and two of each L. Four seam clumps
  (`chibi-forest-seam-N.png`): each clump alone, trimmed and softened the same
  way. The record and runtime manifest is
  `src/assets/chibi-forest-pieces.json` (parameters, the hash of every source
  and output).
- **Validation.** `art:validate` re-derives every piece from its sources and
  fails when the bytes differ (`forestPieceProblems`), like the gloam Grass.

**Geometry.** A piece canvas is `cols x 80` wide and `rows x 80 + 24` tall.
Paint lies only over footprint cells, or in the 24 px band above the topmost
covered cell of a column. A piece never reaches sideways out of its
footprint, so nothing is cut at a coast or a building. At the fog a piece
is cut along the cells it shares with the fog, under the cloud's edge, and
its band is not drawn over an unexplored cell.

**The band.** In the band a column holds at most one clump, and that clump
rises no higher than it does on its own 80 x 104 master (5 to 19 px). A piece
therefore covers no more of the row above than the old Forest cell did. The
dense join between two rows of forest is made by the north seam clump
instead, which is drawn under the units and only where the cell above is
Forest.

### Softness

A canopy of full-contrast clumps reads much heavier at board scale than one
clump on open Grass, even though each pixel is an old Forest pixel. The bake
therefore softens every piece (`SOFTEN` in the script):

- **Gaps.** In pieces of three or four cells, 18% of the clumps are left out
  (never on the front line of the bottom row), so more ground shows.
- **Inner outlines.** A dark outline pixel inside the canopy moves 60% of the
  way to the foliage around it. An outline pixel within two pixels of
  transparency is the outer silhouette and keeps its black line, so trees
  still read as chibi sprites.
- **Tone.** Every foliage pixel moves 20% of the way to the mean foliage
  colour of the old clumps, which calms the highlights and the shadows, and
  then 16% of the way to the mean Grass colour.
- **Clump weights.** The two old clumps are drawn twice as often as the two
  new, more saturated ones.

The target was the midpoint between the old Forest cell (the clump on its
Grass, what a whole old tile averaged) and the piece as stamped. `stats`
measures the footprint cells as the board shows them, over `chibi-grass-1`
with the shade:

| Cell                             | Luma  | Saturation | Luma spread | Outline share |
| -------------------------------- | ----- | ---------- | ----------- | ------------- |
| Old Forest cell (clump on Grass) | 54.6% | 44.1%      | 19.1%       | 6.2%          |
| 2x2 piece as stamped             | 42.6% | 40.2%      | 20.2%       | 11.8%         |
| Midpoint (the target)            | 48.6% | 42.1%      | 19.7%       | 9.0%          |
| **2x2 piece softened**           | 47.9% | 42.0%      | 14.7%       | 4.4%          |
| **All pieces softened**          | 48.9% | 42.7%      | 15.0%       | 4.8%          |

Luma and saturation land on the midpoint. The luma spread (contrast inside
the cell) and the share of outline-dark pixels are below both the old cell
and the stamped piece, which is what lets the forest sit behind units and
buildings.

Undead territory and Snow need no variants of their own: the ground under
the trees is the cell's own ground, and the snow caps are computed from the
softened rasters at run time.

## Review

`scripts/art/chibi-forest-review.ts` captures matching screenshots of the
real game with the old single clumps and with the composed forests:

```sh
npx vite --port 6191 --strictPort &
CHROME_PATH=... npm run art:chibi-forest-review -- <out-dir>
```

It mounts the real Ruleset 7 app view over six generated Dry Land states
(`scripts/art/chibi/forest-review-scenes.ts`): the untouched start, Forest
against Mountains, a capital with improvements and units in Forest, a whole
map, an Ice Folk capital (Snow) and an Undead capital (gloam ground). The
"before" shots use the board host's `composedForests: false` option, which
exists only for this review.

## Research record

The approach was chosen in bead `pulp_wars-maw.1` on a research branch:
multi-tile pieces on fixed 2 x 2 blocks beat edge/corner autotiling (tall
3/4-view trees do not tile seamlessly) and a global packing (clearing one
cell could re-pick a whole region). PixelLab's `generate-image-v2` with the
old clump as style image produced convincing dense pieces, but with drifting
tree scale and straight rectangular edges; the stamped derivation keeps the
live scale and its footprint rule gives soft outlines, so production uses it.
