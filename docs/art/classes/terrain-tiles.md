# Terrain Tile Asset Contract

This contract specializes [Pulp Wars Art Direction](../ART_DIRECTION.md) for
Grass, Forest, Mountains, Fruit, Ore, Animal, fog, and renderer-owned map marks.

## Provenance and calibrated footprint

Modern Polytopia has no public native 2D terrain sprite sizes or pivots; its
current presentation is 3D. The research measured only screenshot proportions,
not original assets. The following are configurable **Pulp Wars geometry
contracts**, chosen around the observed 1.65–1.75 diamond ratio and not presented
as Polytopia metadata.

| Property                   |       Source |  Nominal display |  Runtime registration |
| -------------------------- | -----------: | ---------------: | --------------------: |
| Ground diamond             | 256 x 148 px |  128 x 74 CSS px |     `(128,74)` source |
| Mountain variants 1 / 2    | 256 x 296 px |  107.52 x 124.32 |    `(128,179)` source |
| Mountain variant 3         | 256 x 296 px |    102.4 x 118.4 |    `(128,186)` source |
| Forest canopy variants     | 256 x 296 px | 128 x 148 CSS px | `(128,222)` +23 CSS Y |
| Fruit and Animal resources | 256 x 296 px | 128 x 148 CSS px | `(128,222)` +23 CSS Y |
| Other low-object canvases  | 256 x 296 px | 128 x 148 CSS px |    `(128,222)` source |
| Low overlay canvas         | 256 x 148 px |  128 x 74 CSS px |     `(128,74)` source |

The accepted mountain files retain their original 256 x 296 canvases and
generation composition around `(128,222)`. The first runtime calibration used
one 0.5 scale and `(128,186)` registration for all three, which left the broad
variants at 121 CSS px wide and the flat-base third variant 78 CSS px above / 38
CSS px below its tile center. Second-play review replaced that shared geometry
with the per-variant registrations above. Visible nominal bounds are now
`-50.82..50.82 x -58.38..30.24` for variants 1/2 and
`-43.2..42.8 x -62.4..30.4` for variant 3.

Mountains also receive a deterministic runtime clip which is unbounded above
the tile center but follows the owning diamond's lower half below it. This
retains intentional peak overhang while guaranteeing that foreground alpha
cannot paint into the tile below. The flat third source previously exceeded
that sloped lower edge by up to 10.66 nominal CSS px; its clipped overflow is
zero. This is runtime placement only: ground projection, ore, Mines, picking,
simulation coordinates, accepted PNGs, and their hashes are unchanged.

Second-play review found that the accepted Forest, Animal, and Fruit alpha all
ended at or just above source `y=222`, leaving the owning diamond's entire lower
half visually empty. Those three categories now retain the source `(128,222)`
composition and 0.5 scale but receive a 23 CSS px downward runtime offset at 1x
zoom (equivalent to the established `(128,176)` settlement registration). This
places their visible bottoms at `20.5..23` CSS px below tile center, reduces
rear-tile overlap by the same 23 px, and leaves Ore, Mines, Lumber Mills,
Chocolate Walls, settlements, mountains, and every ground diamond unchanged.

The logical projection is:

```text
screenX = originX + (gridX - gridY) * tileWidth / 2
screenY = originY + (gridX + gridY) * tileHeight / 2
```

with default configurable `tileWidth=128` and `tileHeight=74`. These values are
CSS/render space only and never simulation constants.

## Ground diamond and edges

The ground diamond's four vertices are source `(128,0)`, `(256,74)`,
`(128,148)`, and `(0,74)`. The outermost one-pixel contour may be transparent or
an intentional shared seam treatment, but adjacent identical grass tiles must
show no light/dark crack at 0.625x, 1x, or 1.75x zoom on DPR 1 and 2.

Grass is a broad quiet field with at most three large low-contrast decorative
forms per variant. Create four rotation/decoration variants selected
deterministically from tile coordinate and cosmetic renderer seed; variants may
not imply resources, passability, ownership, or state. The core hue/value is
stable enough that many adjacent tiles read as one board.

Ownership tint/border, legal move, selection, path, target, ZOC, and grid focus
are separate renderer overlays. Do not bake them into grass.

## Mountains and resources

Mountain alpha uses the 256 x 296 object canvas and the per-variant runtime
registration described above. Its ground-contact footprint must remain inside
the lower ground diamond; the renderer enforces this independently of imperfect
generated base shapes. Preferred visible bounds are `x=12..244`, `y=6..244`;
hard alpha bounds are the full canvas except the final 8 px bottom safety strip.
At nominal scale, current accepted silhouettes extend at most 62.4 CSS px above
the tile center, 50.82 CSS px laterally, and 30.4 CSS px below it before the
lower-diamond clip.

Use one or two exaggerated peaks, broad planes, strong outline, and simpler
shading than units. Avoid photoreal strata, snow noise, pebble scatter, or tiny
procedural marks. Produce at least three mountain silhouettes so repetition is
controlled without changing mechanics.

Forest is authoritative terrain, not Grass decoration. Its ground diamond uses
the same 256 x 148 mask and projection; a separate 256 x 296 canopy uses the
source `(128,222)` anchor, 0.5 display scale, and calibrated 23 CSS px downward
runtime offset. Preferred canopy bounds are `x=24..232`,
`y=24..238`; hard bounds are `x=12..244`, `y=8..252`. Trunks/contact stay
inside the owning diamond's lower half while foliage may overhang upward.
Provide at least four cosmetic canopy variants selected without simulation
PRNG; none may imply Animal, Lumber Mill, defense, or ownership.

Ore is a separately composited low object/mark anchored to the same tile. It
must be recognizable on an explored mountain before Mining and distinguishable
at nominal 0.75x zoom. An unmined vein and completed Mine are different assets;
do not hide ore by changing authoritative visibility in the renderer. Ore may
overlap no more than 24 CSS px above the mountain contact region and must not
be mistaken for a unit status marker.

Fruit is a separately composited low resource on grass using the same object
canvas/anchor class. It must read as one harvestable cluster rather than grass
decoration, remain distinct from ore/Mine/status symbols at 0.75x, and stay
inside the owning ground diamond's lower-half boundary. Prefer a broad chunky
silhouette with at most three large fruit forms and a leaf/container cue; avoid
many small dots. Empty grass decoration can never resemble fruit.

The accepted `terrain-fruit` production source is an untrimmed 256 x 296 PNG
composed around `(128,222)`, displayed at 0.5 scale, and lowered 23 nominal CSS
px at runtime. Its alpha bounds are `x=83..172`, `y=150..222`, producing a
44.5 x 36 CSS px marker whose visible vertical bounds are now `-13..23` around
tile center. The renderer uses this accepted raster in the low-resource layer; the prior
code-native cluster remains only as its asynchronous loading/error fallback.

Animal is a separate low resource on Forest using the 256 x 296 object canvas,
source `(128,222)` anchor, 0.5 scale, and the same 23 CSS px downward runtime
offset as its canopy. It must read as wildlife rather than a unit,
owner marker, or canopy decoration at 0.75x. Preferred alpha bounds are
`x=48..208`, `y=116..238`; hard bounds are `x=24..232`, `y=84..252`. The
canopy may frame but never hide it. Hunt removes only Animal; Forest remains.
A completed Lumber Mill is supplied by the building class.

Every explored resource is drawn regardless of whether its action technology
is researched; locked state belongs to semantic UI, not a dimmed or swapped
world asset. An ordinary Mountain is visually the same terrain class without
the Ore overlay. Render code reads terrain/resource/improvement and must never
infer Ore/Animal from cosmetic variants. Harvest consumes Fruit; Hunt consumes
Animal but leaves Forest; Mine consumes Ore; Lumber construction requires empty
Forest. Changes animate only
from authoritative events and never alter simulation timing.

## Fog and territory

Unexplored fog is a renderer-owned scalable overlay/mask, not generated terrain
and not baked into tiles. It must fully withhold terrain/entity information,
have a stable readable boundary, and avoid realistic volumetric lighting.
Persistent explored tiles never re-fog under POC rules.

Territory/ownership treatment uses color plus a pattern/border. It must remain
legible under grayscale and common color-vision simulations and cannot obscure
unit feet, ore, selection, or city labels. Capital/connectivity paths have no
special visual treatment unless selected by gameplay UI.

## Draw layers and transparency

Draw map content in this order:

1. unexplored fog diamonds for hidden tiles;
2. revealed ground diamonds back-to-front;
3. ownership and low grid/path overlays for revealed tiles;
4. low Fruit/Ore resources and Mine/Lumber Mill footprints;
5. contact shadows;
6. revealed mountains, Forest canopy, buildings, Forest Animal frontage, and
   units sorted by ground anchor; Animal follows its owning canopy within the
   same tile so a single-raster canopy can frame but never erase the resource;
7. selections/effects and semantic status UI.

Unexplored tiles contribute only an opaque fog entry: no underlying ground,
terrain-feature, city, unit, label, status, or target enters the render plan.
Drawing fog before every revealed layer therefore withholds hidden information
while ensuring known ground, neighboring mountains, units, and status markers
are never painted over by a fog diamond merely because their illustration
overhangs the tile edge.

All raster sources use straight alpha, sRGB, clean edge RGB, and no matte. Ground
diamonds are transparent outside their four vertices. Object canvases are
transparent outside the object. Do not trim exports. Tall objects may cross
neighbor canvases; Canvas clipping must allow this and sorting tests must cover
both grid axes.

## Scaling, palette, and readability

Sources are 2x nominal and downsample uniformly. Recommended zoom is
0.625x–1.75x. High-quality interpolation matches the illustrated style; do not
use nearest-neighbor pixel-art scaling. The ground palette stays lower contrast
and lower saturation than units, cities, targets, and HUD. Mountains must remain
distinct from grass by value and silhouette without dominating a unit placed
on them.

At minimum test: plain Grass, Fruit with/without a unit, mixed Forest variants,
Animal/empty Forest/Lumber Mill with and without units, dense mixed Ore/non-Ore
Mountain fields, capital Grass-or-Forest corridor, Mountain with unit, Ore
with/without unit, completed Mine, selected/targeted tiles, every player
ownership treatment, fog edge, and maximum four-player map zoomed to fit.

## PixelLab recipe and acceptance

Terrain production uses checked-in PixelLab scripts with prompt, negative
prompt, exact dimensions, model/settings, seed when supported, and output map.
If generation cannot guarantee exact diamond masks, a checked-in deterministic
post-process may apply the mask; record it in the manifest. Never use manual
cutouts as the only reproducible source.

Generate at least three representative Grass variants and three Mountain
variants as the existing sample. Forest is a new class sample: generate and
inspect three canopy variants individually before batching. Animal is reviewed
individually on all three accepted Forests in occupied, selected, locked,
hunted, minimum-zoom, and repeated-map contexts. Fruit and Ore samples retain
their individual review. Inspect each at source,
native display, minimum zoom, and in repeated 8 x 8 contact sheets. Reject
seams, edge halos, asymmetry
that breaks adjacency, noisy repetition, false gameplay marks, clipped peaks,
wrong camera, excessive detail, or palette competition with units. Test all
four diamond edges against every compatible variant. Batch only after three
assets pass individual review and the recipe is stable; inspect batch contact
sheets and every suspected failure individually.
