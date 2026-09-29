# Tile-80 style test, September 2026

**Status:** nonproduction test for bead `pulp_wars-305`. It changes no
production manifest, asset registry, runtime code or
[art direction](ART_DIRECTION.md). It follows the
[September style exploration](STYLE_EXPLORATION_2026-09.md) and tests only
two styles from it, Flat-shaded (Pixflux) and Bold chibi (Pixen).

## Demo images

To check the images on a phone, open a phone mock at full width. One image
pixel is then one device pixel, so the sprites appear at their true size.

| Image                                                                                           | Size      | What it shows                                                  |
| ----------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| [phone-compare](../../art/explorations/tile80-study-2026-09/demo/phone-compare.png)             | 2340x2532 | Both phone mocks side by side, at the same scale               |
| [phone-flat-shaded](../../art/explorations/tile80-study-2026-09/demo/phone-flat-shaded.png)     | 1170x2532 | 390x844 CSS at DPR 3; tile 80 CSS = 240 px; sprites x3 nearest |
| [phone-bold-chibi](../../art/explorations/tile80-study-2026-09/demo/phone-bold-chibi.png)       | 1170x2532 | Same scene, Bold chibi                                         |
| [desktop-flat-shaded](../../art/explorations/tile80-study-2026-09/demo/desktop-flat-shaded.png) | 1440x900  | DPR 1, tile 80 px, sprites 1:1                                 |
| [desktop-bold-chibi](../../art/explorations/tile80-study-2026-09/demo/desktop-bold-chibi.png)   | 1440x900  | Same scene, Bold chibi                                         |
| [sprites-flat-shaded](../../art/explorations/tile80-study-2026-09/demo/sprites-flat-shaded.png) | 1480x1920 | Each sprite at 1:1 and x4, owners A and B, grass 3x3 repeat    |
| [sprites-bold-chibi](../../art/explorations/tile80-study-2026-09/demo/sprites-bold-chibi.png)   | 1480x1920 | Same, Bold chibi                                               |

Raw URLs for a phone browser use this pattern:
`https://raw.githubusercontent.com/nadbordrozd/pulp_wars/main/art/explorations/tile80-study-2026-09/demo/phone-compare.png`.
Run `npm run art:tile80-study-review` to rebuild the images. It needs no
credentials and makes no PixelLab calls. It also writes
[`demo/index.json`](../../art/explorations/tile80-study-2026-09/demo/index.json),
which lists the size, hash and owner-mask share of every sprite.

## What was generated

Each sprite was generated natively for an 80 CSS px tile at zoom 1 and
DPR 1. Denser screens use integer nearest-neighbour upscales of the same
master: x2 for DPR 2 and x3 for DPR 3.

| Sprite            | Canvas (px)        | Placement in the 80x80 tile                               |
| ----------------- | ------------------ | --------------------------------------------------------- |
| Fighter, Marksman | 56x80, transparent | 70% of the tile width, 100% of its height; bottom-centred |
| City              | 72x72, transparent | Centred, with a 4 px margin (90% of the tile)             |
| Grass             | 80x80, opaque      | Fills the tile; tiles seamlessly                          |

- **Pipeline:** the generator is the existing
  [`style-exploration.ts`](../../scripts/art/style-exploration.ts), run with
  `--manifest scripts/art/tile80-study-manifest.json`. The
  [manifest](../../scripts/art/tile80-study-manifest.json) holds every prompt,
  negative prompt, option set, seed and size. Each run also leaves a record
  and a credential-free receipt in
  [`art/explorations/tile80-study-2026-09/`](../../art/explorations/tile80-study-2026-09/),
  along with the raw candidates and the review verdicts.
- **Cost:** 40 PixelLab calls, about US$0.29 in total. Eight sprites were
  accepted and 32 recipes rejected. The record notes give each reason.
- **Prompts:** the Fighter and city prompts are the ones from the previous
  study. The Marksman prompt asks for a red hood and tunic and a tall
  curved longbow. It rules out a shield, sword or helmet. The flat-shaded
  Marksman needed one addendum: its bow had to stand out from the body.
- **Owner colour:** the owner colour is a red mask, and owner B is that mask
  remapped to teal, as in the previous study. The mask covers 22–52% of each
  sprite's opaque pixels.

## Pedestals

All eight accepted sprites have no pedestal, base, plate, disc or slab.

- **Units:** a positive sentence was added to the unit prompts: "nothing is
  drawn under it". Plate words were also added to the exclusions. After
  these changes, only one unit came back on a block (a chibi Fighter), and
  it was rejected.
- **Cities:** text-to-image failed. All 12 city generations came back on a
  grass plate, soil disc, stone floor or slab. The prompt variations that
  failed included:
  - high top-down and side views;
  - "cut-out sprite" wording;
  - a new prompt with no mention of a town or a map piece;
  - plate words placed in the description, in Pixflux's `negative_description`
    field, or nowhere at all.
- **The fix for cities:** a second pass with PixelLab's
  `edit-image-pixen` endpoint worked. The instruction was "Remove all
  ground… keep the buildings… exactly the same". It worked on the first
  attempt for both styles:
  - the flat-shaded city is an edit of `flat-shaded-city-e`;
  - the chibi city is an edit of `bold-chibi-city-a`.

  A production city recipe should plan for this generate-then-edit step.

## Grass

A text-to-image "seamless tile" always came back as a framed island with a
border, hedges or a vignette. That happened with eight prompts. The fix
was to generate a 160x160 meadow instead. The script then crops the 80x80
window whose wrap-around seams differ least. This is a pure crop, so no
pixel is resampled or repainted. The crop origin and seam cost are stored in
the record. Both accepted tiles show no seam in a 3x3 repeat.

## Per-style observations

- **Flat-shaded (Pixflux):**
  - The units are clean and read well at phone size. The Marksman's bow is
    thinner than the chibi one but clearly different from the Fighter.
  - The city after the edit is small inside its canvas, about 60% of the
    tile. It reads more as a house with a tower than as a town.
  - The grass is a very saturated lime. It is quiet and seamless, but loud
    next to the HUD.
- **Bold chibi (Pixen):**
  - This style has the strongest silhouettes. The oversized sword, shield
    and bow make the Fighter and Marksman obvious at a glance, and the
    walled city fills the tile well.
  - The grass is a calmer mid-green. Its outlined tufts sit on a visible
    regular grid, which reads as wallpaper over a large map area.
- **Both styles:** the red mask also catches some red-brown shading on the
  chibi shields, boots and bow, and on the flat Fighter's shield. Owner B
  therefore shows faint teal tinges on those parts. A production recipe
  needs a stricter "no red-brown" rule, or a hand-checked mask.
