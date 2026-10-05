# Mountains as massifs

**Beads:** `pulp_wars-e9f` (ranges), `pulp_wars-6kn` (mines and features),
`pulp_wars-2o7.1` (massifs). The user asked on 2026-10-04 for mountains to
get the treatment of the [composed forests](COMPOSED_FORESTS.md), as ranges
that span several tiles. The first range set did that with small peaks on
the rocky ground tile, and the user's review on 2026-10-05 was: "most of the
mountain tile is just the grey background and mountains tend to sit low on
the tile. As a result a block of mountains 2x3 looks like a bunch of
disconnected peaks and ranges on a flat grey plane."

In the CHIBI art set a group of Mountain cells is now drawn as one mountain
mass. The LEGACY art set is unchanged. No rule and no map generation
changed.

## What a Mountain cell draws

| Layer      | Pass         | What                                                                                                                             |
| ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Ground     | `GROUND`     | The rocky ground tile, cut back with the fringe along edges that face other land, darkened into lower slopes. Snow goes over it. |
| Low piece  | `TALL_BODY`  | Its footprint, after the Roads and under every unit and building.                                                                |
| Band       | `FOREGROUND` | A low piece's top 13 px above its cell, at the cell's turn, where the old mountain's overflow was drawn.                         |
| Tall piece | `TALL_BODY`  | The whole mountain, peaks up to 48 px over the row behind included, under every unit and building.                               |
| Snow caps  | both         | Ice Folk: the caps of a piece, column by column, over the columns whose own cell is Snow.                                        |

The drawing is in `src/render/canvas/chibi-massif-v7.ts`; the forests'
module no longer knows about mountains.

**Pieces fill their cells.** A piece is a ridge two cells wide or a single
mountain. Its rock runs from one side of its footprint to the other and
down to its foot, with peaks 60 to 110 px tall: about twice the scale of the
first set. The rock covers 50% (low singles) to 69% of the footprint.

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

**The ground is lower slopes.** Under a massif every pixel of the rocky
ground moves 45% of the way to a blue-grey between the lit and the shaded
rock faces (`MASSIF_GROUND_V7`), so what still shows between pieces reads as
scree, not as a pale plane. On the north side of an area (the cell above is
not Mountain, and Grass is drawn under the fringe) the ground also starts
lower: its top 22 px (plus or minus 7, wavy, behind a darker rim) are cut
away, so the back row's peaks stand against the land behind them. Beside a
cell whose ground is whole the cut runs out over 26 px, so no step shows.

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
its master over the rocky ground), so the build menu, the gallery and Help
show the mountain the board draws. The two old masters stay the default art
behind it: the classic look and a failed load fall back to them.

While the piece set loads, or if it fails to load, every Mountain cell draws
its single mountain as before.

## The cover

`packMassifV7` covers the plain Mountain cells row by row. Each run of
neighbouring cells in a row becomes ridges, with a single mountain where
the run is odd, laid like bricks: an even run of four or more in an odd row
starts and ends with a single, and the parity of the run's first cell picks
the end an odd run's single goes to. The ridges of one row therefore do not
line up with those of the next. A piece is tall when every cell above it is
a plain Mountain. No piece takes the variant of the piece west of it or of
the pieces above it.

- **Deterministic:** the cover reads the explored Mountain cells and their
  coordinates only, so a map always draws the same massifs.
- **No fog leak:** only explored cells are covered, and a piece is tall
  only over explored Mountain.
- **Not local.** A changed cell (a Mine built, a cell explored) re-picks
  the pieces of its own run, and through the no-repeat rule it can change
  the variant of pieces east of it and in the rows south of it. The roles
  are computed once per plan.

The first set's 1x2 and 2x2 pieces are gone: depth now comes from tall
pieces overlapping the row behind, not from pieces two rows deep.

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
Each recipe carries its review.

| Kind     | Variants | Made of                                                                                       |
| -------- | -------- | --------------------------------------------------------------------------------------------- |
| 1x1 low  | 8        | `s26`: whole single mountains 76 px wide.                                                     |
| 2x1 low  | 8        | `s20`, `s24`, `s25`: massifs 150 to 156 px wide and 71 to 92 px tall, three of them mirrored. |
| 1x1 tall | 6        | `s29`: single mountains 94 to 107 px tall, two of them mirrored.                              |
| 2x1 tall | 6        | `s08`: massifs 106 to 116 px tall (generated for the first set and then too large), mirrored. |
| Mine     | 1        | `s28`: the Mine edit of an `s26` mountain.                                                    |

29 PixelLab calls are recorded: 18 for the first set and 11 for this one
(`s19` to `s29`). What they taught:

- **`generate-image-v2` copies the scale of its style image.** With the old
  single mountain as style image every result is 61 px wide, whatever the
  subject says (`s22`, `s23`). A style image that fills its canvas is
  copied at the requested size, which is how the low ridges were made from
  the tall `s08` massifs (`s20`, `s24`, `s25`).
- **An enlarged style image gives a larger mountain.** A recipe's
  `styleImage.enlarge` trims the source, resizes it without smoothing and
  stands it on a canvas of the request's size; the copies are then clean
  pixel art at the new scale (`s26`, `s29`). Only the style image is
  resampled, never a master.
- **Results that fill the image are often cut by its edge** (`s21`, `s11`,
  the main peak of `s24` and `s25`). `footed` in the bake gives such a
  raster a stepped rocky contour and an outline along a clipped side; no
  piece of the final set needs it, but the bake keeps it.
- Off-subject results still come: a volcano and a mountain with a lake and
  trees among four tall singles (`s27`).

**Derivation.** `recipes.json` lists, for each piece, the reviewed raster
it is made of. The raster is trimmed to its opaque box, mirrored if asked,
centred in the piece and stood 3 px above the bottom of its footprint. Then
the piece is softened: a dark outline pixel inside the rock moves 45%
towards the rock around it, while the outer silhouette keeps its black
line; and calmed: every rock and snow pixel moves 14% towards a mid
blue-grey, because rock now covers most of a mountain area. Nothing is
resampled. The bake fails if paint lies outside the footprint, more than
13 px above it (low) or more than 48 px above it (tall).

The record and runtime manifest is `src/assets/chibi-mountain-ranges.json`.
`art:validate` checks that every recorded candidate is unchanged and
re-derives every master (`mountainRangeProblems`).

### Tone

`stats` measures the footprint cells as the board draws them. The first two
rows are over the plain rocky ground, the others over the darkened one:

| Cell                                     | Luma  | Saturation | Luma spread | Outline share | Rock covers  |
| ---------------------------------------- | ----- | ---------- | ----------- | ------------- | ------------ |
| Old Mountain cell (single on its ground) | 58.1% | 15.3%      | 20.6%       | 6.7%          | not measured |
| First range set, all pieces (bead `e9f`) | 58.8% | 18.4%      | 18.3%       | 3.0%          | not measured |
| 1x1 low                                  | 55.2% | 19.0%      | 17.2%       | 3.7%          | 50%          |
| 1x1 tall                                 | 54.4% | 19.9%      | 17.4%       | 3.8%          | 69%          |
| 2x1 low                                  | 53.1% | 21.9%      | 17.6%       | 4.0%          | 65%          |
| 2x1 tall                                 | 52.5% | 21.3%      | 16.2%       | 3.2%          | 63%          |
| **All pieces**                           | 53.5% | 20.9%      | 17.1%       | 3.7%          |              |

A mountain cell is five points darker than before (the ground is, by
design), two and a half points more saturated, and has a little less
contrast inside the cell. The outline share is up from 3.0% to 3.7%: bigger
silhouettes carry more outline.

## Review

`scripts/art/chibi-forest-review.ts <out-dir> mountains` captures matching
screenshots of the real game with the single mountains and with the massifs
(forests composed in both): a mountain-heavy window, Forest against
Mountains, a capital with Mines and units on Mountains, a whole map, an Ice
Folk capital, and drawn blocks (two by three, three by two, a column, a
row, a single). The "before" shots use the board host's
`composedMountains: false` option, which exists only for this review. The
seeds were picked again on map revision V4.

## Known limits

- **Ground still shows** between pieces: beside a ridge narrower than its
  two cells, in the hollow at the foot of some ridges, and round a low
  single, whose base is a diamond (half of its cell is rock). It is dark
  scree now, not a pale plane, but it is not slope art.
- **The top row is lower than the rows in front of it** (13 px against up
  to 48), so an area rises towards the viewer.
- **A unit on a Mountain is drawn over the peaks of the row in front of
  it**, where strict depth would put the peaks first.
- **Two ridge families.** The `s24` rounded massif is softer in shape than
  the pointed `s08` and `s20` massifs.
- **Mountains are bigger and louder than before**: a mountain-heavy map
  shows a lot of white snow and dark shadow.
- The mined mountain's interface master still shows the plain rocky ground
  under it, not the darkened one.
