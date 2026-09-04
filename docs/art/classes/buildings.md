# Building and Settlement Asset Contract

## Active square-grid override

The active presentation follows the
[square-grid experiment](../SQUARE_GRID_EXPERIMENT.md). Farmed land and every
low improvement must fill or sit wholly inside the 128 x 128 square footprint;
tall machinery and settlements may overflow upward only. Nothing may cross the
left, right, or bottom edge. All replacements use upper-left key lighting.
Diamond-era canvases and measurements below remain temporary historical
provenance until their dedicated square batches are accepted.

## Ruleset-6 active inventory

Ruleset 6 adds one shared functional production raster for Farm, Lumber Camp,
Mine, Quarry, Windmill, Sawmill, Forge, Stoneworks, Workshop, Grand Works, and
Market. Mine may be explicitly reused; Lumber Mill may be explicitly
revalidated and aliased as Lumber Camp. Chocolate Wall and faction city sets
remain separate retained assets. No economic building receives faction-specific
mechanics or a hidden Candy fallback.

Farm, Lumber Camp, Mine, Quarry, and Road-side footprints use the existing 256
x 296 low-building class at `(128,222)`. Windmill, Sawmill, Forge, Stoneworks,
Workshop, Grand Works, and Market use 384 x 384 at `(192,288)`, display scale
0.30, preferred bounds `x=24..360,y=24..326`, hard bounds
`x=8..376,y=8..344`. They must leave contributors selectable and cannot hide a
unit or city label. Grand Works must remain distinct from Workshop at minimum
zoom; Market cannot look like a generic city.

Roads are modular infrastructure, not one building sprite. PixelLab supplies a
quiet road material patch/edge family on the 256 x 148 ground overlay canvas;
checked-in deterministic masks compose the 16 orthogonal N/E/S/W connection
variants. Diagonal visual joins are forbidden because the mechanical network is
orthogonal. Road overlays must coexist legibly with every resource,
improvement, Wall, unit, ownership pattern, and selection.

The building sample gate is Farm, Quarry, and Windmill individually, then
Sawmill/Forge/Stoneworks, then Workshop/Grand Works/Market. Review every
processor beside zero through its maximum practical contributors, merged Farm
and Camp clusters, all four Stoneworks pair axes, cross-city contributors,
expanded territory borders, fog edges, unit occupancy, all owner overlays,
0.625x/1x/1.75x, DPR1/2, and dense mature-city contact sheets. Function must be
readable before UI lines are added. A successful generation without these
spatial contexts is not acceptance.

Processor links, cluster outlines, pair axes, family chips, live-value numbers,
Road connection glow, construction/destruction, and population/coin feedback
are code-native. Existing ruleset-5 inventory prose below is historical where
it limits the set; its style, alpha, anchor, sorting, and PixelLab gates remain
active.

## Accepted square improvement sample gate

The active square sample gate accepts exactly these three shared sources:

- `building-square-farm`: a fully opaque 256 x 256 ground treatment at
  `(128,128)`. Checked-in deterministic processing preserves the PixelLab field
  texture, supplies four periodic cultivated furrows, and makes opposing edge
  pixels identical. Orthogonal Farm connectivity remains derived from public
  Farm coordinates; connection, cluster, owner, and selection state are not
  baked into the raster.
- `building-square-quarry`: a transparent 256 x 296 low improvement at
  `(128,222)`, accepted alpha bounds `x=64..191,y=144..244`. Three cut blocks
  plus the short timber hoist distinguish it from Stone, Ore, Mine, city, and
  terrain while leaving units readable.
- `building-square-windmill`: a transparent 384 x 384 processor at `(192,288)`,
  accepted alpha bounds `x=94..290,y=38..322`. Its four-sail silhouette keeps
  lateral and bottom safety, permits only intentional upward extension, and is
  smaller than the accepted square Mountain and Forest forms.

All three match the northwest light, remain legible at 0.625x through 1.75x and
DPR1/2, and fit the shared 112 x 130 action/selection/technology viewport.
Their accepted IDs and URLs are registered, but map coverage deliberately
continues to use the previous assets until the integration boundary in e1m.9.

## Accepted square extraction and processor family

The next square family accepts exactly five shared sources from two ordered,
bounded PixelLab invocations: `building-square-lumber-camp` plus
`building-square-mine`, followed by `building-square-sawmill`,
`building-square-forge`, and `building-square-stoneworks`. The accepted IDs and
URLs are registered, while runtime coverage remains deliberately deferred to
e1m.9.

Lumber Camp and Mine retain the 256 x 296 low-building canvas and `(128,222)`
anchor. Their accepted alpha bounds are respectively `x=86..170,y=164..244`
and `x=88..167,y=158..244`. At 0.5 source scale they remain compact in front of
the complete accepted square Forest/Mountain treatment and behind unchanged
units. Lumber Camp uses an open timber rack, upright saw and two logs; Mine uses
a dark opening, three timber braces and diagonal pick. Neither replaces or
hides its authoritative underlying terrain.

Sawmill, Forge and Stoneworks retain the 384 x 384 processor canvas and
`(192,288)` anchor. Their accepted alpha bounds are respectively
`x=86..298,y=109..316`, `x=90..294,y=88..316`, and
`x=88..296,y=95..316`. At 0.3 source scale every silhouette is smaller than the
accepted square Forest and Mountain forms, crosses no lateral or bottom edge,
and leaves the lower-right renderer attachment area clear. Sawmill is defined
by its open canopy, upright circular saw and log stack; Forge by its squat
furnace, chimney and exterior anvil; Stoneworks by its finished arch, short
hoist and fitted blocks.

Deterministic review covers both factions, all supported zoom/DPR pairs, dense
Road/resource/city/fog/ownership/selection contexts, and exact 112 x 130 UI
reuse. Processor contexts cover zero, one, four and eight contributors.
Renderer-owned mint level squares show exact Sawmill values `0/1/4/8`, Forge
values `0/2/8/16`, and Stoneworks values `0/1/8/16`, including Stoneworks
opposite-pair axes; squares wrap after eight and no contributor, pair, value or
state mark is baked into a raster.

## Accepted square civic and commerce family

The final bounded square improvement family accepts exactly three shared
PixelLab sources from one manifest-ordered invocation:
`building-square-workshop`, `building-square-grand-works`, and
`building-square-market`. All use the transparent 384 x 384 processor canvas,
anchor `(192,288)`, display scale `0.30`, and deterministic
`compact-building-fit` processing with ground contact at source `y=316`.
Their accepted alpha bounds are respectively `x=99..284,y=104..316`,
`x=80..304,y=80..316`, and `x=90..293,y=92..316`. They cross no lateral or
bottom edge, stay smaller than the accepted square Forest and Mountain forms,
and reserve the lower-center/lower-right attachment area for unchanged units
and renderer-owned economy marks.

Workshop is one modest open craft shed with an oversized gear, bench, and
mallet: it reads as mixed basic craft rather than a specialized processor.
Grand Works uses a tall capped central hall and three broad discipline wings:
it is clearly grander than Workshop at minimum zoom without becoming a city.
Market is one open striped pavilion with a large balance scale and two crates:
it reads as commerce, never a settlement or ownership banner. All three share
the accepted southeast-facing camera, soft northwest key light, dark southeast
planes, strong charcoal-teal outline, and broad flat shading.

Deterministic review covers both factions; source/native/enlarged inspection;
`0.625x`, `1x`, and `1.75x` at DPR1/2; exact 112 x 130 action, selection, and
technology reuse; occupied tiles; Roads, resources, city, fog, territory,
ownership, and selection; and dense mature 3 x 3 plus expanded cross-city 5 x
5 maps. Workshop shows distinct-basic contributors and exact population
squares `0..4`; Grand Works shows three/four advanced-processor contributors
and exact `+6/+8` squares; Market shows distinct-family income `0..4` plus the
capital-Road bonus to `5`. Contributor lines, family shapes, live-value
squares, and Road indication are code-native and unobscured. Accepted URLs are
registered, but runtime asset coverage and bindings remain deferred to e1m.9.

This contract specializes [Pulp Wars Art Direction](../ART_DIRECTION.md) for
capitals, cities, villages, Mines, Lumber Mills, Chocolate Walls, and city
reward markers.

## Provenance and calibrated geometry

Modern Polytopia publishes no stable public 2D building sprite canvases, pivots,
or runtime dimensions. Its current buildings are presented in a 3D scene. These
are provisional, configurable **Pulp Wars contracts** calibrated from the
research's observed tile ratio and tall-object overhang, not Polytopia metadata.

| Class                     | Source canvas | Display canvas at 1x | Ground anchor |        Hard alpha bounds |
| ------------------------- | ------------: | -------------------: | ------------: | -----------------------: |
| Mine                      |  256 x 296 px |     128 x 148 CSS px |   `(128,222)` | `x=20..236`, `y=12..252` |
| Lumber Mill               |  256 x 296 px |     128 x 148 CSS px |   `(128,222)` | `x=20..236`, `y=12..252` |
| Chocolate Wall            |  256 x 296 px |     128 x 148 CSS px |   `(128,222)` | `x=20..236`, `y=84..252` |
| Village                   |  256 x 296 px |     128 x 148 CSS px |   `(128,176)` | `x=20..236`, `y=12..252` |
| City level 1              |  384 x 384 px | 115.2 x 115.2 CSS px |   `(192,236)` |   `x=8..376`, `y=4..344` |
| City levels 2–3 / capital |  384 x 384 px | 115.2 x 115.2 CSS px |   `(192,243)` |   `x=8..376`, `y=4..344` |

The nominal ground diamond is 128 x 74 CSS px. Settlement canvases intentionally
allow modest lateral and upward overhang and are never clipped to the diamond.
First-play review reduced city runtime scale from 0.5 to 0.3. Second-play review
then found that the accepted settlement alpha ended only 7.5–13.2 CSS px below
the tile center, so the buildings still read as high-floating objects. The
per-asset anchors above now put every accepted settlement base at 30–30.5 CSS px
below center, against the diamond's 37 CSS px bottom. Visible nominal bounds are
`-38..50.5 x -63.5..30.5` for the village, `-50.4..50.4 x
-55.5..30.3` for level 1, and `-53.4..54 x -70.5..30.3` for levels 2/3.
This preserves 88.5–107.4 CSS px silhouette widths while making the buildings
fill their tile without enlarging adjacent overlap. The Mine retains its low
object anchor. Untrimmed source canvases and accepted PNGs remain mandatory and
unchanged.

## Required POC set

- one neutral village;
- city level 1, level 2, and level 3 for the approved POC faction language;
- every city level 4+ reuses the level-three body unchanged and receives a
  renderer-owned numeric level badge until a later approved art contract adds
  higher-level bodies;
- a capital distinction compatible with every level, preferably a separate
  renderer-added crown/flag attachment rather than duplicated full sprites;
- unmined ore is terrain class; one completed Mine is a low building and may
  replace only an explicit `ORE` resource, never an ordinary mountain;
- one Lumber Mill is a low building on authoritative Forest with no remaining
  Animal/resource; it never replaces the Forest terrain/canopy and must remain
  readable between trunks without resembling a Mine or settlement;
- Workshop and City Wall persistent reward cues. Survey and Resources are
  one-off events and need icons/UI, not permanent map structures.
- one Chocolate Wall destructible-structure sprite: a low broad brick wall made
  unmistakably from chunky chocolate-bar segments. It is faction-owned but not
  a city, unit, improvement, or City Wall reward. It must remain readable over
  Grass, Mountain, Forest, Fruit, Ore, Animal, Mine, and Lumber Mill because
  rules allow each coexistence. It has no face, limbs, hard hat, text, damage,
  baked health bar, owner color, selection, or rubble state.

City levels 1–3 must read as the same settlement growing. Preserve base silhouette
and add one or two large forms per level rather than replacing architecture or
adding tiny clutter. A city remains identifiable beneath a unit occupying its
tile. Capital, level, wall, ownership, and siege cannot rely on one color alone;
renderer markers/text provide redundant cues.

The neutral village is faction-neutral and visibly smaller than a level-one
city. Mine, Lumber Mill, and Chocolate Wall must not resemble an occupied city
or a unit. POC city sprites
may use the chosen test-faction visual language, but should not silently canonize
one of the example factions from general art direction.

The neutral treasure chest is one compact closed pickup, not a settlement,
resource node, improvement, or unit. Its lock and lid silhouette must survive
minimum zoom, while its painted bounds remain smaller than standard map units
and substantially smaller than a terrain body. Use the shared northwest light,
transparent background, and a centered ground anchor; no alpha may overflow
the owning square to the left, right, or bottom. It renders as a low tile-stack
body above terrain/fog and below units and interaction/status overlays. Review
the exact source at native and nearest-neighbor enlarged scale, then at
0.625x/1x/1.75x over representative Original and Candy terrain.

## Draw composition and anchor behavior

Buildings sit at their ground anchor at the projected tile center and share the
stable depth sort with mountains and units. The tile may also contain a unit;
render the city base/low structure before the unit and permitted tall back
structure according to documented sublayers:

1. ground and ownership;
2. low building footprint/base, Mine/Lumber Mill, and Chocolate Wall;
3. renderer contact shadow;
4. back/tall settlement body;
5. unit at the same anchor;
6. optional foreground settlement lip no higher than 18 CSS px above anchor;
7. capital/reward/siege/selection/status overlays and city label.

If one flat city raster cannot preserve unit readability, export named `back`
and `front` layers on identical 384 x 384 canvases with the same anchor. The
front layer may contain only the low lip; it must never hide the unit's head,
weapon, HP, or owner cue. Layer splitting and output mapping must be reproducible
in the checked-in manifest.

## Palette, line, and transparency

Use chunky silhouette, strong colored dark outline, flat fills, and two-to-three
level cel shading. Terrain remains quieter, units remain the most characterful
objects, and buildings occupy the middle detail/contrast budget. At 384 px
source, main exterior outlines target 8–14 px; downscaled outlines must match
standard units perceptually.

Reserve a clear faction-color area but keep function legible without that hue.
City level changes through level 3 should alter mass/silhouette; levels 4+ are
distinguished by the code-native badge and must not enlarge or procedurally
decorate the raster. Workshop and City Wall need
shape cues. Check grayscale, four player-color overlays, grass, mountain
neighbors, fog edges, selection, siege, and a unit on the city.

Export straight-alpha sRGB with clean RGB edges and no matte, scenery outside
the building, tile ground, text, city label, selection, health/status UI, cast
shadow, or fog. No alpha crosses hard bounds. Do not trim.

## Scaling and UI attachments

Keep source canvases unchanged. Village, Mine, Lumber Mill, and Chocolate Wall
canvases display at 0.5 source
scale with their distinct registrations above; city canvases display at 0.3
source scale with level-specific registration; camera zoom then applies
uniformly across the board's supported 0.625x–1.75x range. Device-pixel ratio
changes backing resolution only. Capital crown, owner marker, siege icon,
reward marker, numeric level badge, and city label are renderer/UI attachments anchored by
normalized metadata and kept upright/readable; they are not simulation geometry
and never enter hashes or hit tests. Hit test the logical city tile and DOM
affordances, not sprite alpha.

## PixelLab recipe and acceptance

Checked-in PixelLab scripts/manifests record exact prompt, negative prompt,
canvas, model/settings, seed when supported, layer/output mapping, and any
deterministic alignment/downscale processing. Prompts enforce three-quarter
downward view, isolated transparent building, shared faction/function language,
chunky outline, flat/cel shading, no realistic architecture, no scene, no text,
and no baked UI/shadow.

The first individual sample is village, level-one city, and level-three city;
then add Mine to test the existing low class. Lumber Mill is a new low-building
sample and must be inspected individually on at least three accepted Forest
variants, with/without unit, selected, minimum zoom, and beside Mine before any
low-building batch. Inspect source/enlarged, 1x display, minimum
zoom, and on-map with units in front/behind along both grid axes. Reject anchor
drift, clipped overhang, matte/halo, unreadable growth, city/unit occlusion,
wrong camera, faux-3D/painterly detail, palette competition, or accidental
gameplay marks. Batch only after at least three representative building assets
pass individually and the recipe is stable. Review batch contact sheets, then
inspect suspected failures individually.

Chocolate Wall is a separate individual structure sample. Generate and inspect
it before integration at source/native/minimum zoom on every compatible
terrain/resource/improvement, beside Choco Engineer and City Wall reward, with
a unit in every adjacent direction, at 10/5/1 HP using code-native health UI,
and under all owner overlays. Reject a wall that reads as an ordinary chocolate
bar/character, merges into brown Mountains, hides a resource/improvement,
floats above the diamond, crosses hard bounds, or bakes damage/ownership/UI.
