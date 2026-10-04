# Composed mountain ranges

**Bead:** `pulp_wars-e9f`. The user asked on 2026-10-04 for mountains to get
the treatment of the [composed forests](COMPOSED_FORESTS.md), with one
difference: mountains must read as continuous ranges that span several
tiles, not as a field of single rocks.

In the CHIBI art set a group of Mountain cells is drawn as ranges. Before,
every Mountain cell drew its own small mountain. The LEGACY art set is
unchanged. No rule and no map generation changed.

## What a Mountain cell draws

| Layer           | Pass         | What                                                                                                            |
| --------------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| Ground          | `GROUND`     | Unchanged: the rocky ground tile, cut back with the fringe along edges that face other land. Snow goes over it. |
| Range footprint | `TALL_BODY`  | The range piece, drawn once at its last cell's turn, after the Roads and under every unit and building.         |
| Band            | `FOREGROUND` | The piece's band above its top row, in that row's turn, where the old mountain's overflow was drawn.            |
| Snow caps       | both         | Ice Folk: the caps of the range, cell by cell, over Snow cells only.                                            |

There is no shade layer and no join piece. A single mountain between two
ranges was tried first and made the board a crowd of small rocks; a low
generated foothill was tried next and read as a grey slug lying between the
ridges. Ridges now simply stand end to end on the shared rocky ground.

**Cells that keep the old single mountain.** A Mined Mountain is its own
terrain subject and is never part of a range: a Mine is drawn exactly as
before. A Mountain cell with Ore, a Treasure, a curiosity, a Grave, a Field
Defense or a settlement is a clearing and also keeps the old sprite.

While the piece set loads, or if it fails to load, every Mountain cell draws
its single mountain as before.

## Packing

Mountains use a region-wide cover, `packRangeCoverV7` in
`src/render/canvas/chibi-forest-packing-v7.ts`. The explored Mountain cells
are scanned north to south and west to east, and each free cell takes the
largest piece that fits with it as its top-left cell:

1. a 2x2 massif where four free cells form a square (three times in four by
   a hash of the cell, so a large area is not all squares);
2. else a 2x1 ridge;
3. else, for about a third of the cells with a free cell below (by hash), a
   1x2 north-south ridge, in a variant no ridge beside or above it has;
4. else a single mountain. Singles alternate their two variants in a
   checkerboard, so two neighbours never match.

Ridges therefore line up along a row and chain into long ranges, and a
single mountain appears only where nothing larger fits. The L shapes are not
used.

- **Deterministic:** the cover reads the explored Mountain cells and
  coordinates only, so a map always draws the same ranges.
- **No fog leak:** only explored cells are covered.
- **Not local.** Unlike the forests' 2 x 2 blocks, one changed cell (a Mine
  built, a cell explored) can re-pick the pieces that follow it in its
  region. The first version used the block packing; it left too many single
  mountains and ranges that never lined up. The roles are computed once per
  plan, and a plan is rebuilt only when the view changes.

Forests keep their block packing; nothing about them changed.

## The range set

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

The chibi batch pipeline generates at a class canvas (80 x 104 for tall
terrain) and has no style-image endpoint, so the ranges have their own
recipes and records in `scripts/art/chibi/mountain-ranges/`, under the same
rules: every request is a checked-in recipe, `generate` never repeats a
recorded recipe, records keep the exact credential-free request and the hash
of every candidate, and raw candidates are kept under
`art/pixellab/chibi-raw/mountain-ranges/`. Each recipe carries its review.

**Route.** `generate-image-v2` with the old single mountain
(`chibi-mountain-1.body.png`) as style image. 16 calls:

| Recipe            | Request                            | Result                                                             |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `s01-2x1-v2`      | wide ridge                         | Two ridges used.                                                   |
| `s02-2x2-v2`      | massif, 160 x 184                  | Rejected: huge flat triangles.                                     |
| `s03-2x1-pixen`   | wide ridge, Pixen                  | Rejected: peaks and trees on an isometric slab.                    |
| `s04-2x2-v2`      | massif of about nine peaks         | Unused: a crowd of small peaks.                                    |
| `s05-1x2-v2`      | spine, 80 x 168                    | Rejected: clusters cut at the image edge.                          |
| `s06-2x1-v2`      | wide ridge, `chibi-mountain-3`     | Unused: brown-grey, off the blue-grey palette.                     |
| `s07-1x2-v2`      | spine on a wide canvas             | One north-south ridge used (the only one narrow enough).           |
| `s08-2x2-v2`      | massif of three or four big peaks  | Unused: twice the scale of the ridges.                             |
| `s09-1x2-v2`      | slim ridge of three big peaks      | Unused: three stacked cones.                                       |
| `s10` to `s12`    | ridges and peaks styled from `s08` | Rejected or unused: a style image that fills its canvas is copied. |
| `s13-foothill-v2` | low foothill, 64 x 48              | Unused: tried as joins, read as grey slugs.                        |
| `s14-1x1-v2`      | single mountain, 80 x 80           | Two of sixteen used as the 1x1 pieces.                             |
| `s15-2x1-v2`      | wide ridge, another seed           | All four used.                                                     |
| `s16-1x2-v2`      | narrow spine again                 | Unused: ridges lying across the image.                             |

**One scale.** Every piece is built from rasters of one scale: peaks about
30 to 40 px wide and 60 to 75 px tall, the scale of the `s01` and `s15`
ridges.

| Shape | Variants | Made of                                                                                    |
| ----- | -------- | ------------------------------------------------------------------------------------------ |
| 1x1   | 2        | A generated single mountain each.                                                          |
| 2x1   | 4        | A generated ridge each.                                                                    |
| 1x2   | 2        | The one generated north-south ridge, and its mirror image.                                 |
| 2x2   | 3        | Two generated ridges, one behind the other, the front one overlapping the back one's foot. |

**Derivation.** `recipes.json` lists, for each piece, the reviewed rasters
it is made of. Each part is trimmed to its opaque box, mirrored if asked,
centred in the piece and stood on its row with a recorded offset; parts are
painted north to south; the piece is softened: a dark outline pixel inside
the rock moves 45% towards the rock around it, while the outer silhouette
keeps its black line. Nothing is resampled. The bake fails if paint lies
outside the footprint or more than 13 px above the top row, the most the old
single mountain rises above its cell.

The record and runtime manifest is `src/assets/chibi-mountain-ranges.json`.
`art:validate` checks that every recorded candidate is unchanged and
re-derives every master (`mountainRangeProblems`).

### Tone

`stats` measures the footprint cells over the rocky ground:

| Cell                                     | Luma  | Saturation | Luma spread | Outline share |
| ---------------------------------------- | ----- | ---------- | ----------- | ------------- |
| Old Mountain cell (single on its ground) | 58.1% | 15.3%      | 20.6%       | 6.7%          |
| 1x1 pieces                               | 59.8% | 18.0%      | 17.7%       | 3.1%          |
| 2x1 pieces                               | 58.4% | 18.4%      | 18.3%       | 3.1%          |
| 1x2 pieces                               | 60.5% | 16.2%      | 16.8%       | 2.9%          |
| 2x2 pieces                               | 60.2% | 16.9%      | 16.9%       | 2.1%          |
| **All pieces**                           | 59.7% | 17.3%      | 17.4%       | 2.6%          |

The ranges are as light as the old cell, with less contrast inside the cell
and under half the outline-dark pixels. They are two points more saturated
(a little bluer).

## Review

`scripts/art/chibi-forest-review.ts <out-dir> mountains` captures matching
screenshots of the real game with the single mountains and with the ranges
(forests composed in both): a mountain-heavy window, Forest against
Mountains, a capital with Mines and units on Mountains, a whole map, and an
Ice Folk capital. The "before" shots use the board host's
`composedMountains: false` option, which exists only for this review.

## Known limits

- There is one north-south ridge raster, used as drawn and mirrored. It runs
  diagonally, and a map with many one-cell-wide Mountain columns repeats it.
- A Mine and a feature cell keep the old sprite: a rounder cluster in a
  slightly greener grey, one of them with small trees. Next to a range it
  reads as a different rock.
- Rows of ridges do not join north to south: there is rocky ground between
  two rows of a wide mountain area.
