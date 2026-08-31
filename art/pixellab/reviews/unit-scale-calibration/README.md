# Unit Scale Calibration Review

This directory records the deterministic, accepted-raster-only calibration of
unit display scale against the renderer's 128 x 74 CSS-pixel nominal ground
diamond. No production raster was generated, edited, resampled in place, or
reaccepted for this review.

## Decision

Standard units display their untrimmed 256 x 296 source canvas at `0.25`.
Breacher/siege units display the 384 x 384 class at `0.24`. The reserved
Juggernaut/giant 384 x 448 class uses `0.25`, remains an individual asset gate,
and has no accepted production raster yet. Candy Warrior retains its documented
cosmetic grounding exception, proportionally reduced from 10.5 to 7.5 nominal
CSS pixels; its source anchor, logical coordinate, sort and picking point do not
move.

The selected accepted standards occupy 28.5–43.8% of tile width and 66.9–79.1%
of tile height by non-zero alpha bounds. Their alpha-weighted opaque area is
28.6–41.1% of one diamond and the worst rear/above adjacent-diamond coverage is
7.27%, below the 8% standard cap. Accepted Catapult at `0.24` occupies 55.5% of
tile width, 89.2% of tile height, 52.64% of one diamond by alpha-weighted area,
and at most 9.22% of a rear/above neighbor, below the 12% siege cap.

The 0.20 standard candidate was readable at nominal size but lost too much
signature equipment/body presence at 0.625x. At 0.30, broad Defender reached
49% tile width, 55% opaque diamond area, and 11.98% rear-tile coverage; Warrior
reached 59.17% opaque area. That candidate again made ordinary units read as
terrain-sized masses. The chosen 0.25 midpoint preserves silhouette while
making Mountains and Forests materially larger.

## Evidence

- `candidate-scale-comparison-native.png` compares accepted representative
  Archer, broad Defender and Catapult at all candidate scales. Its enlarged
  companion is a deterministic 2x nearest-neighbor inspection view.
- `map-context-zoom-dpr1-native.png` and `map-context-zoom-dpr2-native.png`
  cover 0.625x, 1x and 1.75x with Grass, Mountains, Forests, a city, standard,
  broad, Candy and siege sprites. Each has an enlarged inspection companion.
- `adjacency-and-city-native.png` covers logical NORTH, EAST, SOUTH and WEST
  neighbors, outlines the measured adjacent diamond, distinguishes rear/above
  NORTH and WEST, and checks representative, broad and siege units on a city.
  Its enlarged companion exposes resampling and edge behavior.
- `review-evidence.json` records source-derived measurements, class contracts,
  candidate comparisons, exact formulas, runtime integration facts, visual
  findings, and artifact hashes.

Every PNG was inspected locally at its checked-in native resolution and through
its checked-in enlarged companion. At every required zoom/DPR, ordinary pieces
remain recognizable without occupying most of the tile, city silhouettes and
labels retain room, terrain remains deliberately larger, and all four adjacent
targets remain legible. Camera zoom and DPR do not alter occupancy ratios
because they scale the sprite and reference diamonds uniformly.
