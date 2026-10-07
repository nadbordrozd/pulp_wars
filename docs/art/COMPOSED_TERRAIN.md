# Mountains as massifs

**Beads:** `pulp_wars-e9f` (ranges), `pulp_wars-6kn` (mines and features),
`pulp_wars-2o7.1` (massifs), `pulp_wars-2yc.1` (the look). The user asked on
2026-10-04 for mountains to get the treatment of the
[composed forests](COMPOSED_FORESTS.md), as ranges that span several tiles.
Three passes settled the structure. On 2026-10-05 the user said of the
look: "makes mountains prettier. the current ones are just ugly", asked for
light "consistent with everything else in the game, the sun is in the south
west - bottom left", and from four options chose "D - no new art": the
existing pieces restyled by code, standing on the cell's own ground.

In the CHIBI art set a group of Mountain cells is drawn as one mountain
mass. The LEGACY art set is unchanged. No rule and no map generation
changed.

## What a Mountain cell draws

| Layer      | Pass         | What                                                                                                                               |
| ---------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Ground     | `GROUND`     | The cell's own ground: the Grass of its territory, the faction's grass over it, then Snow and the sand of a coast, as on any land. |
| Low piece  | `TALL_BODY`  | Its footprint, after the Roads and under every unit and building.                                                                  |
| Band       | `FOREGROUND` | A low piece's top 13 px above its cell, at the cell's turn, where the old mountain's overflow was drawn.                           |
| Tall piece | `TALL_BODY`  | The whole mountain, peaks up to 48 px over the row behind included, under every unit and building.                                 |
| Snow caps  | both         | Ice Folk: the caps of a piece, column by column, over the columns whose own cell is Snow.                                          |

The drawing is in `src/render/canvas/chibi-massif-v7.ts`.

**No rocky ground.** A massif cell does not draw the grey rocky ground tile
(bead `pulp_wars-2yc.1`). The mountain's foot is cut away in a ragged line,
so the ground shows there and the mountain grows out of it: default Grass,
a faction's grass inside its territory, Snow on Snow, sand where the cell
touches water. The darkened and cut rocky ground of the massif bead is
gone. The rocky ground tile and the Mountain fringe remain only for the
fallback (see below).

**Pieces fill their cells.** A piece is a ridge two cells wide or a single
mountain, with peaks 60 to 110 px tall.

**Low and tall.** Every kind of piece comes in two heights:

- A **low** piece rises at most 13 px above its footprint, the most the old
  single mountain did. It stands wherever the cell above is not a plain
  Mountain: the top row of an area, and under a Mine or a feature cell.
- A **tall** piece rises up to 48 px over the row behind it, and stands
  only where every cell above it is a plain Mountain, so its peaks cover
  rock, never a unit's cell, a building or open land. It is drawn whole in
  the body pass. A unit standing on the Mountain behind it is therefore
  drawn over its peaks and stays whole (the peaks are behind the unit, not
  in front of it, which is the readable order rather than the strict one).

Row over row, the peaks of each front row cover the feet of the row behind.
A block two cells wide and three deep is three ridges, the two front ones
tall: one massif.

**Mines and feature cells** (bead `pulp_wars-6kn`). A Mined Mountain is its
own terrain subject and is never part of a ridge. Its cell draws its ground
and, over it, the **mined mountain**: a single mountain of the massif scale
with the Mine dug into it (a timber-framed entrance and an ore cart), at the
saturation the live look gives buildings and with snow caps on Snow. A
Mountain cell with Ore, a Treasure, a curiosity, a Grave, a Field Defense or
a settlement draws a low single mountain and is never part of a ridge. The
piece south of a Mine or a feature cell stays low, so nothing rises over
what stands there.

The mined mountain is also registered in the direction registry under
`TERRAIN:MINED_MOUNTAIN` (`CHIBI_RANGE_MINED_MOUNTAIN_ART_ASSETS_V7`, with
its master on Grass), so the build menu, the gallery and Help show the
mountain the board draws. The two old masters stay the default art behind
it: a failed load falls back to them.

While the piece set loads, or if it fails to load, every Mountain cell draws
its old single mountain on the rocky ground, cut back with the fringe along
edges that face other land, as before the ranges.

## The cover

`packMassifV7` covers the plain Mountain cells row by row. Each run of
neighbouring cells in a row becomes ridges, with a single mountain where
the run is odd, laid like bricks: an even run of four or more in an odd row
starts and ends with a single, and the parity of the run's first cell picks
the end an odd run's single goes to. The ridges of one row therefore do not
line up with those of the next. A piece is tall when every cell above it is
a plain Mountain. No piece takes the variant of the piece west of it or of
the pieces above it.

- **Deterministic:** the cover reads Mountain cells and their coordinates
  only, so a map always draws the same massifs.
- **At the fog** (bead `pulp_wars-2yc.28`,
  [TERRAIN_AT_THE_FOG.md](TERRAIN_AT_THE_FOG.md)): the cover is packed over
  the explored Mountain cells and the unexplored cells that the map was
  made with as Mountain (the ghosts), so it is the cover of the whole map,
  and only the explored cells' share of a piece is painted: half a ridge,
  a tall mountain without the peaks that would stand on the fog. Exploring
  a cell then changes nothing in the cells already seen. Without ghosts
  (`?fog-terrain=0`, a board built by hand) only explored cells are
  covered, as before.
- **Not local.** A changed cell (a Mine built, a cell explored) re-picks
  the pieces of its own run, and through the no-repeat rule it can change
  the variant of pieces east of it and in the rows south of it. The roles
  are computed once per plan.

## The set

`scripts/art/chibi-mountain-ranges.ts` generates and derives the pieces.

```sh
npm run art:chibi-mountain-ranges -- plan
node node_modules/.bin/tsx --env-file=<file> scripts/art/chibi-mountain-ranges.ts generate <id>...
npm run art:chibi-mountain-ranges -- review <out.png> <id>...
npm run art:chibi-mountain-ranges -- bake
npm run art:chibi-mountain-ranges -- check     # also in art:validate
npm run art:chibi-mountain-ranges -- stats
npm run art:chibi-mountain-ranges -- sheet <out.png>
```

The chibi batch pipeline generates at a class canvas and has no style-image
endpoint, so the mountains have their own recipes and records in
`scripts/art/chibi/mountain-ranges/`, under the same rules: every request is
a checked-in recipe, `generate` never repeats a recorded recipe, records
keep the exact credential-free request and the hash of every candidate, and
raw candidates are kept under `art/pixellab/chibi-raw/mountain-ranges/`.
Each recipe carries its review. (With `MOUNTAIN_RANGES_RUN=<dir>` the
`plan`, `generate` and `review` commands work on another run's directory:
the style exploration and the faction forests use it.)

| Kind     | Variants | Made of                                                                             |
| -------- | -------- | ----------------------------------------------------------------------------------- |
| 1x1 low  | 8        | `s26`: whole single mountains 76 px wide.                                           |
| 2x1 low  | 7        | `s24`, `s25`, `s31`, `s33`, `s35`: massifs 137 to 156 px wide and 71 to 92 px tall. |
| 1x1 tall | 6        | `s29`, `s30`: single mountains 94 to 107 px tall.                                   |
| 2x1 tall | 6        | `s08`, `s31`, `s32`: massifs 95 to 116 px tall.                                     |
| Mine     | 1        | `s28`: the Mine edit of an `s26` mountain.                                          |

35 PixelLab calls are recorded: 18 for the first set, 11 for the massifs
(`s19` to `s29`) and 6 for this bead (`s30` to `s35`).

### Light: nothing is mirrored

The sun is in the south-west, at the bottom left
([ART_DIRECTION.md, Light](ART_DIRECTION.md#light)). Until bead
`pulp_wars-2yc.1` eight of the 28 pieces were mirrored copies of the others
(two tall singles, three low ridges, three tall ridges), and the lighting QA
measured exactly those eight as lit from the right (faces -13.8 to -36.2).

- **The bake refuses a mirrored part** (`flip`), and measures the rock of
  every derived piece with `scripts/art/lighting-qa.ts`; a piece lit from
  the right fails the bake. The record keeps each piece's numbers
  (`light`): the 28 pieces measure +9.0 to +67.9.
- **The eight were replaced by new left-lit pieces**, not by recomposition:
  six calls in the set's own style (`s30` to `s35`, each with the fragment
  `light-south-west`), of which two tall singles, three tall ridges and
  two low ridges are used: the set has 7 low ridges where it had 8, and 6
  of each tall kind again. `s34` and three candidates of `s33` filled their
  image and were cut at the top; two candidates of `s35` measured lit from
  the right, and a third (snow down every left face) read as white
  triangles on the board.

### Derivation

`recipes.json` lists, for each piece, the reviewed raster it is made of.
The raster is trimmed to its opaque box, centred in the piece and stood
3 px above the bottom of its footprint. Then:

1. **Softened:** a dark outline pixel inside the rock moves 45% towards the
   rock around it, while the outer silhouette keeps its line.
2. **Calmed:** every rock and snow pixel moves 14% towards a mid blue-grey.
3. **Restyled** (`DERIVE.restyle`, bead `pulp_wars-2yc.1`):
   - the black outline becomes dark slate (`#4e4446`);
   - the cool grey rock moves 60% of the way to a warm grey-brown (red up a
     tenth, blue down a fifth);
   - the snow moves half way to cream (`#f4ecd8`);
   - **the foot is cut away**: in every column whose lowest paint lies in
     the bottom 30 rows, the lowest 5 to 11 px (a slow wave) become clear.
     What shows there on the board is the cell's own ground.

   The mined mountain keeps its foot (its entrance and its cart stand
   there), its dark tunnel, and the colours of its timber and ore; only its
   rock, its snow and its outer outline are restyled.

Nothing is resampled. The bake fails if paint lies outside the footprint,
more than 13 px above it (low) or more than 48 px above it (tall), if a
part is mirrored, or if a piece is lit from the right.

**No cut-off peaks** (the user, 2026-10-07). A candidate that fills its
image is cut by the image's top edge, and after the trim that cut is a peak
with a flat top: the low ridges `a` and `e` were baked from two such `s20`
candidates (19 and 17 px of flat top where every whole peak ends 1 to 7 px
wide). They are now the whole silhouettes `s31-1` and `s31-2`, the lower
copies of the rounded tall ridges, and `cutPeakProblem` fails the bake and
the check when a used raw candidate has paint on the top row of its image,
or when a derived or checked-in piece has paint on its top row or a topmost
row of paint wider than 10 px (`PEAK_FLAT_MAX`).
`tests/unit/chibi-mountain-peaks-assets.test.ts` holds the same for every
baked piece, and that none is sliced by its left or right edge.

The record and runtime manifest is `src/assets/chibi-mountain-ranges.json`.
`art:validate` checks that every recorded candidate is unchanged and
re-derives every master (`mountainRangeProblems`).

### Tone

`stats` measures the footprint cells as the board draws them: the old cell
over the rocky ground, the pieces over Grass.

| Cell                                     | Luma  | Saturation | Luma spread | Outline share | Rock covers  |
| ---------------------------------------- | ----- | ---------- | ----------- | ------------- | ------------ |
| Old Mountain cell (single on its ground) | 58.1% | 15.3%      | 20.6%       | 6.7%          | not measured |
| Massifs on darkened rock (bead `2o7.1`)  | 53.5% | 20.9%      | 17.1%       | 3.7%          | 50% to 69%   |
| 1x1 low                                  | 61.8% | 32.7%      | 13.9%       | 0.0%          | 41%          |
| 1x1 tall                                 | 58.4% | 25.6%      | 14.6%       | 0.0%          | 58%          |
| 2x1 low                                  | 60.1% | 29.9%      | 14.2%       | 0.0%          | 49%          |
| 2x1 tall                                 | 58.2% | 28.8%      | 14.7%       | 0.0%          | 52%          |
| **All pieces**                           | 59.6% | 29.5%      | 14.4%       | 0.0%          |              |

A mountain cell is six points lighter than under the massif bead and has
less contrast inside it; its saturation is the Grass's, which now shows
round the rock. No pixel is outline-dark any more: the slate outline is
above the measure's threshold.

## Review

`scripts/art/look-switch-review.ts` with
`scripts/art/mountain-restyle/review-scenes.ts` captures before and after
pairs: the drawn blocks (two by three and others), a mountain-heavy window,
a capital with Mines and units on Mountains, a whole map, an Ice Folk
capital, Martian and Candy territory, and a coast. The change has no
switch, so the "before" side is a second server on a checkout of the commit
before it (`SWITCH_BEFORE_URL`).

The four options the user chose from, and the first lighting measurements,
are in `art/explorations/mountain-styles-2026-10/`.

## Known limits

- **The classic look draws the restyled mountains too.** The piece set is
  one set for the CHIBI art set, as it has been since the ranges; only the
  LEGACY art set keeps the old mountains.
- **The top row is lower than the rows in front of it** (13 px against up
  to 48), so an area rises towards the viewer.
- **A unit on a Mountain is drawn over the peaks of the row in front of
  it**, where strict depth would put the peaks first.
- **The mined mountain has a whole, outlined foot** where its neighbours
  grow out of the ground.
- **Mountains on Snow** stand on the Snow overlay; their rock is not
  snowier than elsewhere beyond the caps.
- **Two ridge families.** The rounded `s24` and `s31` massifs are softer in
  shape than the pointed `s08` and `s32` ones.
- The interface (tile dock, Help) still shows the old single mountain for a
  plain Mountain; the Gallery's Terrain tab shows a piece of the set on
  Grass.
