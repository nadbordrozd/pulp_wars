# Art-style exploration, September 2026: Fighter and city at final resolution

**Status:** nonproduction exploration for bead `pulp_wars-73l.2`. Nothing here
changes the production manifest, the asset registry, `art:validate` inputs,
the runtime, or the [art direction](ART_DIRECTION.md). The user chooses a
direction afterwards. The study follows up the
[September sprite review](reviews/SPRITE_REVIEW_2026-09.md), which found that
the real default camera is about 0.625x zoom, that land units become tan
blobs there, and that sprites carry no owner colour.

## Summary

- **What PixelLab can do:** PixelLab only produces pixel art. Every
  "non-pixel" prompt came back as pixel art at every size tried, up to
  128x148. That covered flat vector cartoon, glossy vinyl toy, ink-and-wash
  storybook, and die-cut sticker with a white border. Different styles are
  therefore available only as pixel-art sub-styles. These differ in outline,
  shading, detail, proportions, and the "game piece" framing (a base or a
  token). PixelLab executes such sub-styles well.
- **Styles accepted:** six styles have an accepted Fighter and city at all
  four target sizes (48 native sprites). They are Chunky 16-bit, Crisp HD
  pixel, Bold chibi (Pixen), Flat-shaded (Pixflux), Tabletop miniature, and
  Board-game counter token.
- **Styles dropped:** Flat vector cartoon, Vinyl toy, Ink storybook,
  Die-cut sticker, and Soft lineless. PixelLab could not execute any of them.
- **Owner colour works in every accepted style.** Each style asked for one
  saturated red owner area and received it, covering 11–70% of the opaque
  pixels. A simple hue mask recolours owner B to teal with no manual work.
  At zoom 0.625 the owner of each unit and city can be read from across the
  board, which is not possible with today's badge.
- **Cost:** 96 PixelLab calls for about US$5.55. The API reports usage per
  job.
- **Top recommendation:** Crisp HD pixel for units and cities, with a
  deliberately large owner-colour area. The runner-up is Board-game counter
  token, if owner readability matters more than charm. Tabletop miniature is
  third. See the [ranked recommendation](#ranked-recommendation).

## Sizes and the size-to-view mapping

The renderer draws square tiles of 128 CSS px at zoom 1
([`geometry.ts`](../../src/render/canvas/geometry.ts); `MIN_ZOOM` 0.625,
`MAX_ZOOM` 1.75). A standard unit uses a 256x296 source canvas at display
scale 0.25, which is 64x74 CSS px. A city fills one tile. Device pixels are
CSS px x zoom x DPR. Every sprite was generated at the device-pixel size of
one view, so the game never has to rescale it:

| Target id    | View                    | Fighter canvas (device px) | City canvas (device px) | Derivation                            |
| ------------ | ----------------------- | -------------------------- | ----------------------- | ------------------------------------- |
| `z0625-dpr1` | zoom 0.625, DPR 1 (fit) | 40x46                      | 80x80                   | 64x74 x 0.625 = 40x46.25; 128 x 0.625 |
| `z1-dpr1`    | zoom 1, DPR 1           | 64x74                      | 128x128                 | 64x74; 128                            |
| `z0625-dpr2` | zoom 0.625, DPR 2       | 80x92                      | 160x160                 | 40x46.25 x 2 = 80x92.5; 80 x 2        |
| `z1-dpr2`    | zoom 1, DPR 2           | 128x148                    | 256x256                 | 64x74 x 2; 128 x 2                    |

Pixen accepts only multiples of 4. The Bold-chibi fighters are therefore
40x48 instead of 40x46 and 64x76 instead of 64x74. The extra 2 px are
transparent rows, and the boards align the painted feet, so nothing is
resampled. All other outputs match their target exactly. Zoom 1.75 was not
covered. A full set would need 112x130 (DPR 1) and 224x259 (DPR 2) as well.
The index in
[`review/index.json`](../../art/explorations/style-study-2026-09/review/index.json)
lists every accepted file with its target size, output size, delta, owner-mask
coverage and SHA-256.

## PixelLab capabilities explored

The published OpenAPI (`https://api.pixellab.ai/v2/openapi.json`) was checked
before generating. The relevant findings are:

| Endpoint               | Sizes                                                                            | Style controls                                                                                  | Notes from this study                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-image-v2`    | any size from 16 px up; 16 candidates at up to 85 px, 4 at up to 170 px, 1 above | text only; optional `style_image` + `style_options`; up to 4 `reference_images` for the subject | Best quality and most candidates per call (US$0.125). Ignores facing: fighters face the viewer, not south-east. The subject reference kept one design across all four sizes.                    |
| `create-image-pixen`   | multiples of 4, up to 512x512 in area                                            | `outline`, `detail`, `view`, `direction`                                                        | One image, about US$0.01. It is the only endpoint that honoured the south-east three-quarter view. It ignored `lineless`. It shrinks cities at 80 px and puts them on isometric slabs.          |
| `create-image-pixflux` | up to 400x400 in area; transparent only up to about 200x200                      | `outline`, `shading` (incl. flat), `detail`, `view`, `direction`                                | One image, about US$0.01. The flat-shading control works. 256 px output came back opaque and needed `remove-background`. The design drifts between sizes because there is no subject reference. |
| `remove-background`    | as input                                                                         | simple/complex task, text hint                                                                  | Rescued two opaque 256 px or 128x148 results cleanly.                                                                                                                                           |

Also available but not used: `generate-with-style-v2` (style from 1–4
reference images), `create-image-bitforge` (style image, up to 200x200),
character/object/rotation/animation endpoints, `create-image-pro-flash`, and
map/tile tools. These would help a production pipeline with consistency and
rotations. They cannot add non-pixel rendering, because every model is a
pixel-art model.

**What PixelLab can and cannot execute:**

- **Can execute:** chunky low-colour pixel art with a black outline; HD pixel
  art with a selective outline; big-head chibi proportions; flat shading;
  board-game framing such as a figure on a base or a round counter token; a
  requested solid owner-colour area; and consistent redraws across sizes via
  `reference_images`.
- **Cannot execute:** smooth anti-aliased vector cartoon, glossy vinyl or 3D
  toy shading, ink linework with watercolour wash, or a white die-cut sticker
  border (ignored on all 20 candidates). Prompts for these styles only nudged
  the costume and proportions of ordinary pixel art.
- **Unreliable:** facing and camera through `generate-image-v2`; lineless
  mode; transparency above 200 px on Pixflux and occasionally on v2; and 2x2
  candidate grids that sometimes arrive as one composition split into
  quarters (`tabletop-mini-city-z1-dpr1-a`).

## Method

- **Script:** generation used a new checked-in script,
  [`scripts/art/style-exploration.ts`](../../scripts/art/style-exploration.ts),
  driven by
  [`scripts/art/style-exploration-manifest.json`](../../scripts/art/style-exploration-manifest.json).
  The manifest holds the shared camera, owner-colour and subject prompts, the
  shared negative prompt, the styles with their endpoint options, the targets,
  and every recipe with its seed.
- **Credentials and receipts:** the API key is read only from
  `PIXELLAB_API_KEY`. Submission receipts store the resolved request without
  credentials or image data. They are in the study's own
  [`submissions/`](../../art/explorations/style-study-2026-09/submissions/)
  folder and use the recovery helper from `pixellab-recovery.ts`. They are
  kept out of `art/pixellab/submissions/` because the production asset tests
  enumerate that directory as flat production receipts.
- **Records:** each recipe has a record in
  [`records/`](../../art/explorations/style-study-2026-09/records/). A record
  holds the job id, the request snapshot (endpoint, model, full description,
  prompt, negative prompt, seed, requested size, options, and reference hashes),
  the cost, the lossless sheet of all returned candidates in
  [`raw/`](../../art/explorations/style-study-2026-09/raw/), and the review
  verdict. That verdict names the chosen candidate, or gives the reason the
  recipe was rejected.
- **Accepted sprites:** these are in
  [`accepted/<style>/<subject>-<target>.png`](../../art/explorations/style-study-2026-09/accepted/).
- **Negative prompts:** PixelLab image endpoints have no negative-prompt
  field. Exclusions are appended as `Must not include: …`, as in the
  production client.
- **Workflow:** each style was sampled first at the zoom-1 Fighter size. Every
  sheet was inspected at native size and enlarged 2–4x. For the v2 styles, the
  accepted zoom-1 design was then passed as a `reference_images` subject
  reference when generating the other three sizes. Pixen and Pixflux have no
  such input, so they got two seeds per cell. Any output that was off-model,
  cropped, too small on the tile, opaque, or split across candidates was
  rejected and regenerated.
- **Shared subject prompts:**
  - Fighter: a chunky cute sword warrior; round steel helmet with a red crest,
    oversized short sword, round wooden shield, red tunic, full body, feet
    visible.
  - City: four red-roofed cottages round a stone keep with a big red banner,
    and a short ring wall.
  - Camera: three-quarter view, slightly downward, facing south-east,
    transparent background.
  - Owner colour: bright red `#d8262c` areas, with no other red anywhere.

### Review evidence

Run `npm run art:style-exploration-review`. It uses headless Chrome from
`CHROME_PATH` and needs no credentials. It rebuilds
[`review/`](../../art/explorations/style-study-2026-09/review/) from the
accepted files:

- **Drawing rules:**
  - Study sprites are drawn 1:1 at integer device pixels.
  - Production terrain (grass, forest, mountain, shallow water from
    `terrain-ruleset7/`) and the production reference sprites are drawn by
    the browser at `displayScale x zoom x DPR` with the game's default
    smoothing. This is the only resampling in the boards, and each board says
    so.
- **Owner colours:** owner A is the generated red. Owner B is the red mask
  (hue ≤ 14° or ≥ 340°, saturation ≥ 0.5, value ≥ 0.3) remapped to teal.
- **Enlargements:** enlarged images are post-hoc nearest-neighbour inspection
  views.

| Evidence                                                                                                                         | What it shows                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [01 board, zoom 1, DPR 1](../../art/explorations/style-study-2026-09/review/01-board-z1-dpr1.png)                                | 4x2 map on production terrain: two owners, five Fighters (one on forest, one inside a city) and two cities, for production plus the six styles.                                                                                |
| [02 board, zoom 1, DPR 2](../../art/explorations/style-study-2026-09/review/02-board-z1-dpr2.png)                                | Same map with the native DPR 2 sprites; terrain is 1:1 here.                                                                                                                                                                   |
| [03 board, zoom 0.625, DPR 1](../../art/explorations/style-study-2026-09/review/03-board-z0625-dpr1.png)                         | The primary legibility test: the default fit camera.                                                                                                                                                                           |
| [04 board, zoom 0.625, DPR 2](../../art/explorations/style-study-2026-09/review/04-board-z0625-dpr2.png)                         | Fit camera on a high-density screen.                                                                                                                                                                                           |
| [05 board 03 enlarged 3x](../../art/explorations/style-study-2026-09/review/05-board-z0625-dpr1-enlarged3x.png)                  | Pixel inspection of the primary test.                                                                                                                                                                                          |
| [06 board 01 enlarged 2x](../../art/explorations/style-study-2026-09/review/06-board-z1-dpr1-enlarged2x.png)                     | Pixel inspection at zoom 1.                                                                                                                                                                                                    |
| [10 style x resolution grid](../../art/explorations/style-study-2026-09/review/10-style-resolution-grid.png)                     | All 48 accepted sprites at native size, with the browser-scaled production row.                                                                                                                                                |
| [11 grid enlarged 2x](../../art/explorations/style-study-2026-09/review/11-style-resolution-grid-enlarged2x.png)                 | The same grid enlarged.                                                                                                                                                                                                        |
| [12 production reference strip](../../art/explorations/style-study-2026-09/review/12-production-reference-strip.png)             | Current Fighter and cities 1–2 on grass at all four views, as the game draws them; [enlarged 2x](../../art/explorations/style-study-2026-09/review/12b-production-reference-strip-enlarged2x.png).                             |
| [13 DPR 2: nearest 2x vs native](../../art/explorations/style-study-2026-09/review/13-dpr2-native-vs-nearest2x.png)              | For every style at zoom 1: the DPR 1 sprite doubled with nearest neighbour next to the separate DPR 2 generation.                                                                                                              |
| [14 zoom 0.625: downscale vs native](../../art/explorations/style-study-2026-09/review/14-z0625-native-vs-browser-downscale.png) | The zoom-1 sprite browser-downscaled to 0.625 (labelled resampled) next to the native 0.625 generation; [enlarged 3x](../../art/explorations/style-study-2026-09/review/14b-z0625-native-vs-browser-downscale-enlarged3x.png). |
| [15 silhouettes at zoom 0.625](../../art/explorations/style-study-2026-09/review/15-silhouettes-z0625-dpr1.png)                  | Alpha-only silhouettes; [enlarged 3x](../../art/explorations/style-study-2026-09/review/15b-silhouettes-z0625-dpr1-enlarged3x.png).                                                                                            |
| [20 dropped styles](../../art/explorations/style-study-2026-09/review/20-dropped-styles-provider-sheets.png)                     | Complete provider sheets for every dropped style, showing that they came back as pixel art.                                                                                                                                    |

## Styles

In the tables below, "legibility" means reading the role (sword and shield),
the owner and the city at a glance on the map boards. Zoom 0.625 is weighted
highest. "Consistency risk" means the risk of keeping about 60 unit, building
and terrain assets coherent in this style.

### 1. Chunky 16-bit pixel art (`chunky-16bit`, `generate-image-v2`)

- **Prompt:** chunky 16-bit retro console sprite; thick 1 px near-black
  outline; about 16 colours; flat colours with one shadow tone; big shapes;
  very low detail; hard pixels; no anti-aliasing.
- **Negative prompt:** anti-aliasing, gradients, soft shading, high detail,
  thin lines.
- **Recipes:** seeds 7301 (zoom-1 master), 7331/7341/7342 (Fighter),
  7351/7400–7402 (city). The smaller and DPR 2 sizes use the accepted zoom-1
  sprite as a subject reference.
- **Zoom 0.625:** good. The sword, shield, crest and red tunic survive at
  40x46. The ring-walled city is the clearest city silhouette in the study,
  and its red roofs make the owner obvious.
- **Zoom 1:** good. It has a clean black outline and reads well on grass and
  forest.
- **Execution:** strong. Candidates stayed on model, and the ring wall was
  complete at three of four sizes.
- **Consistency risk:** low to medium. The limited palette and black outline
  are easy to keep. The facing is frontal, not south-east.
- **Weak points:** the DPR 2 sprites have 1-device-px outlines, which read
  thinner than DPR 1 (see the pixel-art note). The 256 px city lost part of
  its wall.

### 2. Crisp modern HD pixel art (`hd-pixel`, `generate-image-v2`)

- **Prompt:** crisp high-colour indie-tactics pixel art; selective coloured
  outline; hue-shifted shading with small highlights; medium detail.
- **Negative prompt:** pure black outline everywhere, blurry pixels,
  dithering mush.
- **Recipes:** seeds 7302, 7343–7345 (Fighter) and 7352, 7403–7405 (city),
  with the zoom-1 subject reference.
- **Zoom 0.625:** best overall balance. The raised sword and shield separate
  cleanly from the body, the crest and red torso give a strong owner read, and
  the sandstone city reads as a walled town. The selective outline keeps the
  sprite from looking heavy on grass. It is somewhat weaker than the token
  style on busy forest tiles.
- **Zoom 1:** very good. It is the most finished look without losing
  readability.
- **Execution:** strong, and the most consistent across sizes of the v2
  styles.
- **Consistency risk:** medium. The richer palette leaves more room for
  drift. The 256 px city changed its stone from sandstone to blue-grey, so a
  production set would need a style reference or a palette lock.
- **Defects:** the accepted zoom-1 Fighter has a 1–2 px red speck under its
  feet. The frontal facing ignores the south-east camera.

### 3. Bold chibi pixel (`bold-chibi`, Pixen)

- **Prompt:** bold chunky chibi sprite; oversized head and weapon; thick
  single-colour dark outline; low detail.
- **Pixen options:** `single color black outline`, `low detail`,
  `low top-down`, `south-east`.
- **Recipes:** seeds 7406–7421 in two seed sets, plus 7504 and 7512 for the
  80 px city. The accepted sprites use 7406–7409, 7419–7421 and 7512.
- **Zoom 0.625:** the Fighter is the strongest silhouette in the study, with
  an oversized sword and shield and a true three-quarter south-east pose. The
  city is weak: Pixen drew the 80 px town at about 45% of the tile, on an
  isometric dirt slab, even after two retries.
- **Zoom 1:** excellent Fighter. Cities sit on diamond-era isometric slabs
  that clash with the square grid.
- **Execution:** very good for characters and poor for buildings at small
  sizes. It is the only endpoint that honours facing.
- **Consistency risk:** high. There is no subject reference, so helmet type
  and proportions change from seed to seed and size to size (for example, a
  closed great helm at DPR 2 in seed set b).

### 4. Flat-shaded cartoon pixel (`flat-shaded`, Pixflux)

This is the nearest PixelLab gets to the requested flat vector cartoon.

- **Prompt:** flat-shaded cartoon sprite; flat fills without gradients; single
  dark outline; low detail.
- **Pixflux options:** `single color black outline`, `flat shading`,
  `low detail`, `low top-down`, `south-east`.
- **Recipes:** seeds 7422–7437 in two seed sets, plus 7505. The accepted
  sprites use 7425, 7427 and 7429–7432, 7505, and 7506 (the
  `remove-background` pass on the 256 px city from seed 7428).
- **Zoom 0.625:** acceptable. The shapes are clean, but the Fighter is small
  inside its canvas. The cities are isometric houses on grass slabs and read
  as buildings rather than a walled town.
- **Zoom 1:** pleasant and clean, and the closest to the art direction's
  "sticker/board-game" tone.
- **Execution:** fair. The flat shading worked, but designs vary widely
  between sizes: the DPR 2 alternative seed became a bearded dwarf.
  Transparency fails above 200 px.
- **Consistency risk:** high. It is seed-driven, has no subject reference,
  and has the transparency limit.

### 5. Tabletop miniature / board-game piece (`tabletop-mini`, `generate-image-v2`)

- **Prompt:** painted tabletop wargame miniature on a small round dark-green
  base; painted-plastic highlights; chunky toy proportions. Cities add "on a
  small round dark-green base like a board-game building piece".
- **Recipes:** seeds 7304, 7346–7348, 7362 (Fighter) and 7361, 7501–7503,
  7511, 7521 (city), with subject references.
- **Zoom 0.625:** good. The base disc grounds each piece and separates it
  from terrain. It is especially clear on forest and water edges, and it
  answers the review's "unit covers the city" finding because the base marks
  the footprint. At 40x46 the base degrades into a grass tuft.
- **Zoom 1:** good, with a charming board-game feel that fits the art
  direction's "board-game pieces" goal.
- **Execution:** fair. It needed five retries, including one split-quarter
  grid and pieces that were too small at DPR 2, and the DPR 2 Fighter still
  reads slightly smaller.
- **Consistency risk:** medium. The base helps unify a set. Base colour and
  size must be locked. The base is a natural place for the owner colour
  instead of the tunic.

### 6. Board-game counter token (`counter-token`, `generate-image-v2`)

- **Prompt:** chunky board-game counter: the subject stands as a bold emblem
  inside a round token disc with a thick bright red rim; flat colours; very
  low detail.
- **Recipes:** seeds 7507–7508, 7513–7518, 7522–7523 and 7532, with subject
  references. The DPR 2 Fighter went through `remove-background` (7531).
- **Zoom 0.625:** best owner readability in the study. The red or teal ring
  is 37–70% of the pixels and reads instantly at any zoom. The role inside the
  ring is smaller, and the red tunic merges with the red rim. The silhouette
  test shows only discs, so role identity would rely on interior detail.
- **Zoom 1:** clear but less charming. It reads as UI counters rather than
  characters. Rings on forest tiles hide some tree detail.
- **Execution:** fair. The 128x148 canvas made an oval that was clipped at
  the top, a candidate grid arrived opaque, and the 256 px city stayed small
  on its plinth after three attempts.
- **Consistency risk:** low for owner cues and medium for roles. It is
  easy to standardise, but every unit becomes the same circle.

### Dropped styles

All of these are on the
[dropped-styles board](../../art/explorations/style-study-2026-09/review/20-dropped-styles-provider-sheets.png).

- **Flat vector cartoon** (`flat-cartoon`): pixel art with stair-stepped
  edges at 64x74 and at 128x148. It was carried forward as `flat-shaded`.
- **Soft vinyl-toy chibi** (`vinyl-toy`): ordinary chibi pixel art with no
  gloss. The Pixen lineless probe added red halo pixels.
- **Ink/woodcut storybook** (`storybook-ink`): no ink or wash at either size.
  The model added random heraldry.
- **Die-cut sticker** (`die-cut-sticker`): the white border was ignored on
  all 20 candidates. The sticker border would still be a strong legibility
  device. If wanted, it would have to be added deterministically in
  post-processing, which this study did not do.
- **Soft lineless** (`soft-lineless`, Pixen `lineless`): it kept dark
  outlines and was indistinguishable from Bold chibi.

## Pixel-art note: nearest-neighbour 2x vs a separate DPR 2 generation

[Evidence 13](../../art/explorations/style-study-2026-09/review/13-dpr2-native-vs-nearest2x.png)
puts both options side by side on a DPR 2 screen at zoom 1.

- **Line weight:** a native DPR 2 generation is not "the same art at twice
  the resolution". PixelLab draws a 1 px outline at every canvas size, so at
  DPR 2 the outline is 0.5 CSS px, half the weight of the DPR 1 sprite. The
  interior gains detail as well. The result looks thinner and busier, which is
  the "detailed pixel art" the art direction warns against.
- **Design drift:** separate generations drift in design even with a subject
  reference. Examples are the Chunky 16-bit city wall, the HD city stone
  colour, and Tabletop pieces shrinking in their canvas.
- **Nearest-neighbour 2x:** doubling the DPR 1 sprite keeps the exact line
  weight, palette and silhouette, and it looks crisp on high-density screens.
  It is lossless integer scaling, not the downsampling the user excluded.
- **Verdict for pixel styles:** use nearest-neighbour 2x for DPR 2 and
  generate natively only per zoom band. The truly different pixel sizes are
  zoom 1 (64x74) and zoom 0.625 (40x46). A separate DPR 2 generation is worse
  or at best equal in every style tested.

## Zoom 0.625: native generation vs browser downscale

[Evidence 14](../../art/explorations/style-study-2026-09/review/14-z0625-native-vs-browser-downscale.png)
compares the zoom-1 sprite downscaled by the browser (as the game does today)
with the native 40x46 or 80x80 generation.

- **Native wins:** native sprites keep hard outlines and a clear red owner
  area. Downscaled ones get soft outlines and mixed colours. The difference is
  largest for Chunky 16-bit and Bold chibi.
- **Cost of native small sprites:** they are separate drawings. They need the
  subject-reference workflow to stay on model, and a runtime asset selection
  by zoom band that the renderer does not have today.

## Consistency risk for a full asset set

| Style              | Cross-size consistency                        | Set-wide risk | Main mitigation                                                                               |
| ------------------ | --------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| Chunky 16-bit      | good with subject reference                   | low–medium    | fixed palette image; nearest-neighbour 2x for DPR 2                                           |
| Crisp HD pixel     | good with subject reference; one colour drift | medium        | `style_image` from an approved master plus a palette lock; nearest-neighbour 2x for DPR 2     |
| Bold chibi (Pixen) | poor (seed-driven, no reference input)        | high          | only if Pixen gains references; otherwise restyle Pixen masters through v2 `reference_images` |
| Flat-shaded        | poor, plus a transparency limit above 200 px  | high          | as above; add `remove-background`                                                             |
| Tabletop miniature | medium; pieces shrink at DPR 2                | medium        | lock base size, colour and fill ratio in prompts; deterministic fitting                       |
| Counter token      | good for rings, weaker for interiors          | low–medium    | one deterministic ring template; generate only interiors                                      |

Common to all styles:

- **Facing:** `generate-image-v2` does not honour the south-east camera.
- **City bases:** PixelLab likes to put buildings on isometric slabs, which
  fight the square grid.
- **Owner-colour mask:** the red mask needs a rule that no other red appears.
  Prompts enforced this, and review found no false masks except the HD
  Fighter's red speck.

## Ranked recommendation

1. **Crisp HD pixel.** It gives the best balance of legibility at 0.625,
   charm at zoom 1, execution quality and cross-size consistency.
   Recommended recipe:
   - Keep the large owner-colour area (17–29% here).
   - Author zoom-1 and zoom-0.625 masters.
   - Derive the other sizes with v2 `reference_images`.
   - Use nearest-neighbour 2x for DPR 2.
   - Add a palette-locked `style_image`.
   - Accept frontal facing, or fix it by curation.
2. **Board-game counter token.** Choose it if instant owner and unit-count
   readability at the fit camera is the priority. It solves the review's
   ownership finding most completely. It costs character charm and role
   silhouettes, and it would work best with a deterministic ring and
   generated interiors.
3. **Tabletop miniature.** It is the closest to the art direction's
   "board-game pieces" goal. The base solves grounding and unit-in-city
   occlusion, and it could carry the owner colour. It needs tighter fill-ratio
   control.
4. **Chunky 16-bit.** It is very robust and legible, and its cities are the
   best. It looks more retro than playful, and it is a good fallback if HD
   drifts too much.
5. **Bold chibi (Pixen).** It has the best Fighter silhouette and correct
   facing, but cities and cross-size consistency are weak. It is worth
   revisiting for units if a reference-capable Pixen or rotation endpoint is
   adopted.
6. **Flat-shaded (Pixflux).** It is clean but seed-driven, has small figures,
   and has transparency limits.

Whichever style is chosen, the study supports two engineering follow-ups.
The renderer should select sprites per zoom band instead of scaling one
source. Owner colour should be a masked sprite area, not a badge.

## Concerns

- This is a two-subject study. Role differentiation (Fighter against
  Marksman, Guard, Raider) was not tested, and it is the review's main
  finding.
- The owner-colour recolouring in the boards is a review-time hue remap. The
  runtime has no such path yet.
- Only four views were covered. Zoom 1.75 and intermediate zooms would still
  be browser-scaled from the nearest band.
- The review script needs Chrome (`CHROME_PATH`). It deletes and rewrites
  only `art/explorations/style-study-2026-09/review/`.
