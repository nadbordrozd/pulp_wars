# Candy Terrain Production Review

This directory is the checked-in review evidence for the 13 production Candy
terrain/resource rasters. The assets are available to the runtime manifest, but
territory ownership selection is intentionally outside this asset task.

## Sample gate

Four representative PixelLab jobs were generated and reviewed individually
before the batch opened:

| Sample                     | Source | Native | Enlarged | 0.625x | Result                                                                                  |
| -------------------------- | :----: | :----: | :------: | :----: | --------------------------------------------------------------------------------------- |
| `terrain-candy-grass-1`    |  pass  |  pass  |   pass   |  pass  | Quiet green Grass with a cocoa swirl and one tiny icing accent.                         |
| `terrain-candy-mountain-1` |  pass  |  pass  |   pass   |  pass  | Tall peak and shoulder remain Mountain-first; broad cocoa/pink candy strata stay quiet. |
| `terrain-candy-forest-1`   |  pass  |  pass  |   pass   |  pass  | Three canopies and trunks retain the empty-Forest silhouette.                           |
| `terrain-candy-fruit`      |  pass  |  pass  |   pass   |  pass  | Three distinct candy-coated orchard fruits retain the resource cue.                     |

The exact accepted checks, request snapshot, reference hash, seed, output hash,
alpha bounds and review notes are recorded under each ID in
`scripts/art/pixellab-generated.json`. The combined visual check is
`sample-gate-source-native-enlarged-minimum.png`.

## Iteration and rejection record

- The first `terrain-candy-grass-2` candidate, SHA-256 prefix
  `2b1189313563`, was rejected because PixelLab returned an outline and two
  marks over an almost entirely transparent diamond. The second request made
  the filled green field invariant explicit. Its opaque provider exterior was
  corrected reproducibly by the checked-in supersampled diamond mask, zeroed
  transparent RGB and exact normal-Grass reference edge restoration.
- The first `terrain-candy-forest-3` candidate, SHA-256 prefix
  `ccb7035218b0`, was rejected because its central canopy was noisy and
  multi-lobed. The accepted second candidate preserves the normal variant's
  compact three-trunk silhouette with broad clean planes.
- One corrected Grass request was rejected by the API before generation for
  exceeding its 2,000-character description limit. Source-manifest validation
  now enforces that provider limit before submission.
- `terrain-candy-grass-3` and `terrain-candy-grass-4` are deterministic 180°
  derivations of the two accepted PixelLab Candy Grass sources. This is the
  same checked-in repetition-control technique used by the normal Grass family.

Rejected rasters remain quarantined and are never present in the runtime
manifest.

## Full-family result

Every requested output passed exact dimensions, straight alpha, hard bounds,
source anchor, hash and runtime-URL validation:

- Grass 1–4: quiet, recognizably green, lower contrast than all objects and
  units; four variants have a subtle cocoa/pink/cream Candy accent without a
  resource, owner, selection or state cue.
- Mountains 1–3: retain the three calibrated normal silhouettes and clean
  contacts; large cocoa, muted-pink and cream rock-candy planes read at minimum
  zoom without becoming cake, props or resources.
- Forest 1–4: preserve their normal cluster counts, source contact and broad
  canopy footprints; cocoa trunks and pink/cream candy canopies stay simpler
  than units.
- Fruit: retains exactly three orchard-fruit silhouettes, one stem and one leaf.
- Animal: retains one calm low boar silhouette, four planted legs and resource
  scale; raspberry gummy color and cream/cocoa accents do not turn it into a
  combat unit.

`grass-adjacency-all-edges.png` covers all 16 ordered Grass variant pairs on
both grid axes. `repetition-8x8.png` is the required 8x8 stress map at true
0.625x map-fit zoom. `mixed-normal-candy-map.png` checks the territory boundary,
normal/Candy class recognition, resource contrast and unit overlap.
`dpr1-dpr2-map-fit.png` compares CSS-scale DPR1 sampling with source-resolution
DPR2 sampling. No seams, white matte, clipped silhouette, false gameplay mark,
palette collision or unreadable minimum-scale asset was accepted.

`review-evidence.json` records the exact SHA-256 and byte length of every review
artifact plus the final generation records used for the review.
