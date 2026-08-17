# Candy City Production Review

This directory is the checked-in visual evidence for the three production Candy
settlement rasters. The outputs are published in the generated art manifest,
but faction/territory ownership selection remains intentionally outside this
asset bead.

## Individual three-level sample gate

All three city levels were generated sequentially and inspected individually
before acceptance. Level one used the accepted normal level-one city as its
camera, footprint and detail reference. Level two used the accepted Candy level
one as its material and architectural reference; level three used the accepted
Candy level two. This makes growth part of the recorded PixelLab reference
chain instead of three unrelated prompts.

| Asset                    | Source | 0.3x | Enlarged | 0.625x | Result |
| ------------------------ | :----: | :--: | :------: | :----: | ------ |
| `building-candy-city-1`  | pass   | pass | pass     | pass   | Two compact gingerbread halls establish the Candy settlement. |
| `building-candy-city-2`  | pass   | pass | pass     | pass   | The same halls gain one gumdrop-domed tower and a raised center. |
| `building-candy-city-3`  | pass   | pass | pass     | pass   | A second tower and tall cream crest create the final silhouette. |

`individual-source-native-enlarged-minimum.png` shows every accepted untrimmed
384 x 384 canvas on a transparency checkerboard, nearest-neighbor enlarged
alpha, native 0.3 runtime display and minimum 0.625 map zoom. The outlines and
flat shading stay clean, no matte or halo appears, and the broad cocoa,
warm-pink, cream and peppermint material language remains recognizable without
becoming painterly, faux-3D or cluttered.

## Generation history

All three fixed-seed requests passed their first visual review. There were no
rejected or regenerated Candy city candidates. This is recorded explicitly so
the absence of quarantined attempts is not mistaken for missing review history.
The exact provider model, seed, prompt, negative prompt, reference role and
hash, provider/output hashes, alpha bounds and review checks live in
`scripts/art/pixellab-generated.json`.

Deterministic postprocessing preserves the full canvas, normalizes alpha inside
the hard bounds and aligns the lowest visible foundation to y337 for level one
and y344 for levels two and three. Combined with anchors `(192,236)` and
`(192,243)`, this leaves 101 source pixels (30.3 CSS px at 0.3 scale) below the
tile center for the same grounded presentation as the calibrated normal cities.

## Progression and map review

`progression-contact-sheet.png` compares each Candy level with the corresponding
normal settlement. The original two-hall base remains recognizable while one or
two broad masses are added per level. Candy identity comes from material and
shape rather than a gameplay owner color.

`desktop-mixed-map.png` and `mobile-mixed-map-dpr2.png` check mixed normal/Candy
territory, both diamond-grid axes, and units occupying Candy cities. The central
unit can cover the ownership cloth while the side halls/towers still identify
the settlement and level progression. Representative crown, reward and city
label attachments remain outside the raster and have clear placement space.

`zoom-dpr-review.png` covers 0.625x, 1x and 1.75x map zoom at DPR1 and DPR2.
Level-one remains compact, level-two's single tower remains distinct, and
level-three's two towers plus crest remain strongest. No foundation floats,
clips or crosses the hard alpha contract on desktop or mobile presentation.

`review-evidence.json` records the exact SHA-256 and byte length of every review
artifact plus the accepted generation records used to build the sheets.
