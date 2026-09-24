# Square-grid presentation experiment

**Status:** active presentation contract from rollback baseline `07229e2`.

This experiment changes presentation only. The game still stores integer
`(x,y)` coordinates, uses the same cardinal adjacency and command rules, and
produces the same AI, save, replay, and headless outcomes. There is no in-game
square/diamond toggle. Git history at `07229e2` is the explicit rollback point.

## Projection and camera

At 1x camera zoom every logical tile is one axis-aligned `128 x 128` CSS-pixel
cell. The tile anchor is its center:

```text
screenX = originX + gridX * 128
screenY = originY + gridY * 128
```

Logical `x` increases right and logical `y` increases down. Inverse picking
uses the complete square, including exact edges. A shared edge belongs to the
lowest `(row, column)` candidate, so boundary input is deterministic at every
zoom and device-pixel ratio. Arrow keys follow screen axes; Shift+Arrow retains
the optional diagonal cursor shortcut without changing game adjacency.

Pan behavior and the `0.625x` to `1.75x` zoom range are unchanged. Board fit
includes the entire outer half-cell, status space, and temporary accepted tall
art: 148 CSS pixels of upward overhang and 92 CSS pixels laterally. Row-major
depth draws smaller `y` first, then smaller `x`; objects sharing a cell keep
their existing semantic layer and tie order. Tall alpha may rise over earlier
rows but may never change its authoritative anchor or picking cell.

Automated and accessibility-equivalent coordinate activation must first bring
an anchor into the unobscured Canvas when the minimum zoom cannot fit the full
board or the action dock covers its projected point. Review automation does so
through the same bounded pointer-drag pan path as production input, verifies
the resulting camera delta, and only then sends the activation click.

## Footprint and layers

Ground, fog, ownership, selection, command targets, economic contributors, and
territory outlines use the same full square corners. Territory sides are named
`NORTH`, `EAST`, `SOUTH`, and `WEST`. Roads meet the midpoint of those four
square sides. Movement paths, melee lunges, damage shake, and ranged projectiles
interpolate between the same square-cell centers.

New ground art must cover 100% of the square footprint with no transparent
corner gaps. Farmed land and other low improvements remain inside that
footprint. Forest canopy, mountains, settlements, and other genuinely tall
forms may extend above the top edge only. No production terrain or improvement
alpha may overflow the left, right, or bottom edge. These constraints are
checked at source scale and at `0.625x`, `1x`, and `1.75x`, DPR1 and DPR2.

All square terrain and improvements share one three-quarter lighting rule: a
soft key light from the upper-left/northwest, shadow and darker planes toward
the lower-right/southeast, with the flat cel-shaded treatment required by the
general art direction. Lighting never implies gameplay state.

## Transition boundary

Accepted terrain, resource, improvement, settlement, and road rasters remain
temporary inputs until their dedicated square batches pass the PixelLab sample
gates. During that transition the renderer supplies a quiet full-square native
ground underlay and native cardinal road continuity beneath the legacy diamond
art. Production records and raster bytes are not changed by this projection
task.

Every accepted Original and Candy unit raster, source canvas, display scale,
anchor, and byte hash remains unchanged. The former `128 x 74` unit occupancy
ratios are retained only as historical acceptance measurements for those exact
files; on a `128 x 128` cell the same units intentionally read more compactly.

## Territory boundary treatment

Public owner contours use faction colored dashes with a dark casing: 20 CSS
pixels painted and 12 pixels clear per 128 px side at 1x, with 8 px outer and
4 px inner strokes. The dash phase leaves the same gap at every corner. The
selected city's perimeter is solid (9 px casing, 5 px faction color). A shared
border between two publicly known, differently owned tiles alternates 12 px
dashes of both faction colors with 4 px gaps over the casing, including along a
selected-city perimeter. A counterpart behind fog is never inferred. All
measurements follow map zoom; ownership does not introduce a selectable object
or change territory.

Strokes clip to explored ground so their wider edges cannot paint into fog.
Where two public Road cells meet a contour, a 24 px opening preserves the road.
Selection, cursor, reach, and action outlines retain priority above ownership.
Perimeter construction still uses only explored public territory and resolves
one winner per physical edge: selected city, potential expansion, then owner.

The bounded browser comparison is reproducible against a running development
server:

```bash
review_dir=$(mktemp -d /tmp/pulp-wars-territory-review.XXXXXX)
CHROME_PATH=/path/to/chrome-headless-shell npx tsx scripts/browser-territory-review-v7.ts --focused --output="$review_dir"
```

`--focused` captures the selected-city border plus land/naval recruitment in
Full and Reduced motion at desktop DPR 1 and DPR 2. It records sampled terrain
pixels throughout each accepted recruitment boundary. Omitting `--focused`
retains the wider territory comparison matrix. An optional positional URL
selects another development server. The review uses
real browser Canvas and accepted assets in an explicitly synthetic public scene.
It compares the former thin line, the accepted cased dash, and a raised fence
candidate at minimum/default zoom, then shows the final treatment at 0.625x,
1x, and 1.75x with ambient ownership, selected city, unit/action highlights,
varied terrain, adjacent owners, Roads, and fog. Minimum zoom also receives a
DPR2 view. Pixel probes verify that fog and Road crossing pixels are unchanged
and that the visible boundary receives paint. No review rasters become game
assets.

The cased dash was selected because it remains legible against terrain and
makes ownership distinct from the solid selected-city contour. The fence
candidate looked more like a continuous enclosure and gave less room to Roads;
the former uncased line was easy to lose at minimum zoom.
