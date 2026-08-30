# Unit Asset Contract

## Ruleset-6 active inventory

Ruleset 6 requires nine role sprites and portraits per faction. Original:
Fighter, Scout, Marksman, Guard, Raider, Medic, Heavy, Breacher, Juggernaut.
Candy: Candy Warrior, Jelly Scout, Gumball Guard, Choco Engineer, Donut,
Marshmallow Medic, Jawbreaker, Candy Crusher, Sugar Titan. The rules and exact
mapping are [Ruleset 6 section 10](../../product/RULESET_6.md#10-faction-role-mapping-and-candy-reconciliation).

The standard 256 x 296 geometry below applies to Fighter, Scout, Marksman,
Guard, Raider, Medic, Heavy and their Candy substitutions. Existing Warrior,
Archer, Defender, Rider, Candy Warrior, Gumball Guard, Choco Engineer, and
Donut rasters may be explicitly aliased to the corresponding v6 manifest ID
only after native/minimum-zoom review confirms the new role silhouette. A
renamed file or implicit fallback is not acceptance.

Breacher/Candy Crusher use the low-wide 384 x 384 siege geometry previously
calibrated for Catapult but require new melee-siege silhouettes, anchors, and
individual reviews; Catapult art cannot represent them. Juggernaut/Sugar Titan
form a large-unit class on untrimmed 384 x 448 transparent canvases, source
anchor `(192,336)`, 0.30 nominal scale, preferred bounds `x=24..360,
y=12..374`, and hard bounds `x=8..376,y=4..400`. Their contact midpoint must
be within 10 x/8 y source pixels of the anchor. They may overhang standard
units but cannot hide city labels or adjacent targets at minimum zoom.

New silhouette requirements:

- Scout/Jelly Scout: forward exploration pose and one unmistakable viewing or
  trail cue, not a mounted Raider/Donut;
- Medic/Marshmallow Medic: large medical/tool cue without text or a real-world
  protected emblem; must not read as Marksman;
- Heavy/Jawbreaker: broad pushing mass and forward braced equipment;
- Breacher/Candy Crusher: fragile close siege tool/explosive cue, no ranged
  throwing arm, projectile, cannon, gore, or blast baked into the base sprite;
- Juggernaut/Sugar Titan: one giant readable figure with push-ready stance,
  systematic large scale, no scenery or boss UI.

The initial v6 sample is Original Scout/Medic/Breacher, followed by Candy Jelly
Scout/Marshmallow Medic/Candy Crusher. Each trio passes individual source,
native, 0.625x, 1x, and 1.75x review before its faction batch. Each is reviewed
on all terrains, cities, Roads, dense economic buildings, all owner colors,
selected/damaged/reduced-motion contexts, and beside every reused counterpart.
Juggernaut and Sugar Titan are separate individual large-class gates with
occlusion/picking review in every adjacent direction.

Charge, Heal, Push, Breach, Candify, Roll, projectiles, damage, selection, and
status are code-native effects/attachments and never baked into a unit raster.
All v5 text below is historical calibration where it names the old roster or
Catapult; the shared style, transparency, anchor, scale, sorting, PixelLab, and
review requirements remain active.

This contract historically specialized [Pulp Wars Art Direction](../ART_DIRECTION.md) for
Original Warrior/Archer/Defender/Rider, Candy Warrior/Gumball Guard/Choco
Engineer/Donut, and the shared Catapult POC sprite. It does not redefine style.

## Provenance and calibration

Modern Polytopia renders a low-poly 3D world and publishes no stable public 2D
sprite canvas dimensions, pivots, bounds, or runtime display sizes. The values
below are calibrated **Pulp Wars contracts**, not recovered Polytopia metadata.
They use the research's observed approximately 1.65–1.75 ground-diamond ratio,
unit visible-box ranges, and near-center ground contact as composition evidence,
then choose fixed high-resolution source dimensions for repeatable 2D
production. Revisit them only as a versioned renderer/art decision after
native-scale map tests.

## Nominal geometry

The renderer's 1x nominal ground diamond is 128 x 74 CSS px. Standard POC units
use this exact shared contract:

| Property                        |                    Value |
| ------------------------------- | -----------------------: |
| Transparent source canvas       |             256 x 296 px |
| Nominal display canvas          |      89.6 x 103.6 CSS px |
| Source-to-display scale         |   0.35 at 1x camera zoom |
| Normalized feet/contact anchor  |       `(0.5000, 0.7500)` |
| Source anchor                   |          `(128, 222)` px |
| Display anchor                  |    `(44.8, 77.7)` CSS px |
| Preferred visible source bounds | `x=32..224`, `y=10..240` |
| Hard non-effect alpha bounds    |  `x=16..240`, `y=4..252` |

Coordinates use the full, untrimmed top-left-origin canvas. Both feet visually
straddle the contact anchor; the midpoint between their ground contacts must be
within 8 source px horizontally and 6 source px vertically of `(128, 222)`.
Never trim exported transparent edges or infer an anchor from opaque bounds.

First-play review reduced standard-unit runtime scale from 0.5 to 0.35 without
resampling or trimming the accepted PNGs. At nominal display, ordinary body
mass should be about 31.5–53.2 CSS px wide. Across the four accepted POC units,
the complete visible silhouettes (including signature equipment) measure
56.4–78.4 CSS px wide and 76.3–81.9 CSS px tall. Visible alpha extends at most
71.4 CSS px above and 10.2 CSS px below the tile-center contact. Keep the bottom
area quiet: feet/equipment may use it, but no baked shadow or ground.

Second-play review adds one narrow placement exception without changing that
shared source geometry: Candy Warrior receives a 10.5 CSS px downward runtime
offset at 1x zoom. Its accepted alpha ends at source `y=222`, while Original
Warrior extends to `y=252`; the offset gives both a `+10.5` CSS px low extent
from tile center and reduces Candy Warrior's rear-tile overlap by 10.5 px.
Gumball Guard, Choco Engineer, Donut, every Original unit, and Catapult retain
their existing runtime placement. Sorting, shadow/status anchors, picking, and
simulation continue to use the unshifted authoritative ground coordinate.

All eight standard faction sprites are the same size class and use the same
canvas/anchor. Defender/Choco Engineer may read broader and Rider more
forward-leaning, but none may be globally scaled larger. Donut's circular body
still uses its small feet midpoint—not the ring center—as the contact anchor.

Catapult is a separate low-wide siege class:

| Property                        |                    Value |
| ------------------------------- | -----------------------: |
| Transparent source canvas       |             384 x 384 px |
| Nominal display canvas          |     115.2 x 115.2 CSS px |
| Source-to-display scale         |   0.30 at 1x camera zoom |
| Normalized ground anchor        |       `(0.5000, 0.7500)` |
| Source anchor                   |          `(192, 288)` px |
| Preferred visible source bounds | `x=30..354`, `y=24..318` |
| Hard non-effect alpha bounds    |  `x=16..368`, `y=8..336` |

Its wheel/ground-contact midpoint must fall within 10 source px horizontally
and 6 vertically of `(192,288)`. The silhouette may be broader than a standard
unit but must not hide a colocated city's label/status. The untrimmed geometry
is renderer metadata, never simulation size.

## Pose and silhouettes

Every gameplay unit faces down-right/southeast in a consistent three-quarter
view, with a slight downward camera. Character units keep both feet readable;
Catapult keeps both wheel contacts readable. Keep the pose/chassis compact and
avoid perspective tricks that move the anchor.

- Warrior: broad balanced stance and one unmistakable oversized melee weapon.
- Archer: bow curve and drawn/ready gesture readable without a tiny arrow; do
  not confuse the silhouette with Warrior.
- Defender: broad shield is the primary shape and must not completely hide the
  head/body; weight feels planted, not taller.
- Rider: the mount/riding cue must read at 64 x 74 CSS px crop scale while the
  combined figure still fits the standard hard bounds. Favor exaggerated legs,
  saddle, or motion shape over anatomical detail.
- Catapult: one unmistakable wheeled throwing arm and sling/bowl, a low broad
  base, no crew-sized clutter, no arrow/bow silhouette, and no baked projectile.

Candy silhouette requirements are exact:

- Candy Warrior: one cute chunky white marshmallow body, tiny readable feet,
  determined expression, and one oversized red/white candy-cane sword. The cane
  is a weapon, not a walking stick or background prop.
- Gumball Guard: one anthropomorphic glass-topped gumball machine with a clear
  mouth/chute aimed southeast, chunky limbs, and a few large colored gumballs
  inside. It has no bow, arrow, gun, text, coin label, or vending-machine scene.
- Choco Engineer: one anthropomorphic segmented chocolate bar in an oversized
  hard hat, with a single large construction tool/blueprint cue. It must not
  resemble the Chocolate Wall or a plain rectangular UI icon.
- Donut: one chocolate-iced ring donut with a few large sprinkles, little arms
  and feet, and a fierce readable expression. Preserve an open center and round
  rolling silhouette; no motion trail, impact marks, crumbs, or baked shadow.

Candy uses confection shapes and warm cocoa/red/pink accents while retaining a
contiguous 8–15% maskable faction-color patch. Do not make multicolored candy
the ownership cue. Candy Catapult deliberately reuses the accepted shared
Catapult sprite in ruleset 5; no faction-specific siege sprite is approved.

Temporary unit names do not prescribe a final faction costume. One approved
POC faction language must be applied consistently when production direction
exists; do not mix pirate, robot, undead, or other example motifs by accident.

## Line, palette, and shading

Use a strong near-black colored outline, not pure black unless the approved
palette demands it. At 256 px source scale, primary exterior outlines target
6–10 px and important internal separations 4–6 px; both must remain clean after
the 0.35 runtime downscale. Use mostly flat fills and no more than base, one
shadow, and one highlight per material.

Reserve a contiguous, easily maskable faction-color patch covering roughly
8–15% of visible area. It must not be the only owner cue: the renderer adds a
separate marker/pattern. Maintain value contrast between silhouette, equipment,
and face; verify grayscale and common color-vision simulations. Tiny material
accents that vanish at nominal scale are failures, not bonus detail.

## Transparency and separation

Export straight-alpha PNG or the project-approved lossless equivalent in sRGB.
Background pixels are fully transparent with cleaned RGB edge color; no matte,
halo, scenery, text, UI, selection ring, health bar, faction marker, glow field,
or complex cast shadow. A small contact shadow is renderer-owned.

Static weapon magic or muzzle effects are not part of the base sprite. Put
effects in a later effect class with their own anchor. Avoid isolated alpha
specks and semi-transparent outline mush. No opaque pixel may cross the hard
bounds.

## Draw layers and sorting

Units are placed by their feet anchor at the projected tile center. Required
map order is:

1. ground diamond and ownership;
2. low terrain/resource marks;
3. renderer-owned contact shadow;
4. building/terrain/unit bodies sorted by ground anchor using the architecture's
   stable key;
5. sprite-readiness modulation plus code-native selection/target effects;
6. health, faction, and status UI.

The sprite never contains layers 3, 5, or 6. A unit behind a tall object may be
partly occluded by anchor sorting, but selection and health UI remain readable.
Test ties and approach directions along both grid axes.

Readiness never uses a circle/check/tick, detached `W`/`R`, or halo. The actual
unhandled active-human unit raster may pulse between opacity 1 and 0.62 on the
specified 1.6-second loop; health/owner attachments do not. Reduced motion keeps
the raster fully opaque and creates no pulse. This renderer state never changes
or regenerates an accepted sprite.

## Scaling and renderer use

Store the high-resolution source canvas unchanged. Display its full untrimmed
canvas uniformly at 0.35 scale and then apply camera zoom; do not independently
scale by unit type. Recommended camera
zoom is 0.625x–1.75x relative to nominal; below 0.75x the renderer may swap to a
precomputed downsample but may not change anchors. Use high-quality downsampling
for the illustrated style and avoid pixel-art nearest-neighbor scaling.

Device-pixel-ratio changes Canvas backing resolution only. Hit testing uses the
logical tile/unit entity, never opaque sprite pixels. Dimensions and zoom are
renderer configuration and never enter game state, commands, AI, or hashes.

## PixelLab recipe and acceptance

Checked-in generation scripts must record the exact shared canvas, prompt,
negative prompt, model/settings, seed when supported, output mapping, and any
centering/downscale step. Prompts must explicitly require transparent isolated
sprite, three-quarter downward view, southeast facing, visible feet, common
scale, strong outline, flat/cel shading, and no scenery/UI/shadow/text.

Generate Warrior, Defender, and one of Archer/Rider as the first three-sprite
sample; this covers balanced, broad, and elongated silhouettes. Inspect every
result at 128 x 148 display and at 4x source view. Reject and regenerate for:

- wrong camera/facing, invisible feet, anchor drift, clipping, matte/halo, or
  opaque pixels outside bounds;
- silhouette confusion at nominal scale, excessive detail, weak outline,
  realistic lighting/anatomy, faux-3D/painterly rendering, or inconsistent scale;
- baked UI/shadow/scenery, unreadable weapon, poor faction patch, or palette
  failure against both grass and mountain test tiles.

Only batch after at least three representative units pass individually and the
recipe is stable. Review the batch as a labeled contact sheet on transparent,
grass, mountain, selected, and dimmed/enemy contexts, then inspect every suspect
at native and enlarged scale.

Candy production starts with Candy Warrior, Gumball Guard, and Donut as its
required three-sprite individual sample, then Choco Engineer after those three
pass. Review each on Grass/Forest/Mountain, selected, damaged, minimum zoom,
beside its Original counterpart, and in all four owner colors. Reject a
marshmallow that reads as a ghost, a gumball machine that reads as scenery, an
engineer that reads as a wall, a Donut without a clear rolling ring, small noisy
sprinkles/gumballs, or any silhouette outside the standard hard bounds.

Catapult starts a new siege-class sample and is always reviewed individually at
384 px, 115.2 CSS px, minimum zoom, on every terrain, on a city, beside all four
standard classes, and in a dense unit line before any future siege batch. Its
checked-in PixelLab recipe records the separate geometry, prompt, negative
prompt, seed/settings, output mapping, and anchor validation. Reject a floating
base, unreadable throwing arm, accidental bow/arrow, baked ammunition in flight,
excessive height, or UI/health occlusion.

Original Archer metadata retains normalized `projectileOrigin: (0.70,0.37)`.
Gumball Guard requires individually calibrated normalized `projectileOrigin`
on the mouth/chute of its untrimmed 256 x 296 canvas; the manifest value must
remain inside opaque mouth/chute alpha and may not be copied blindly from the
Archer. Catapult has no approved projectile attachment. The arrow, gumball, and
impacts are code-native Canvas primitives, not PixelLab assets and not part of
raster alpha bounds. Check each attachment at
0.625x/1x/1.75x, DPR 1/2, and every target direction. Calibration requires a
versioned manifest change and refreshed visual evidence.
