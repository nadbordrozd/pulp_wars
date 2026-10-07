# Chibi production pipeline

**Status:** built in bead `pulp_wars-67q.2` for the
[chibi migration](CHIBI_MIGRATION_PLAN.md). Batches 1–5 generate, review and
register their art with it. The [chibi direction](CHIBI_ART_DIRECTION.md)
sets the rules; the [asset inventory](CHIBI_ASSET_INVENTORY.md) sets each
batch's subjects, canvases and anchors.

## Files

| Path                                                                         | What                                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [`scripts/art/chibi/fragments/`](../../scripts/art/chibi/fragments/)         | Prompt fragments: style, cameras, owner colour, one per class, and the ground-removal edit                         |
| [`docs/art/factions/<ID>.md`](factions/)                                     | Faction fragment: the first `text` block under "Prompt fragment" and "Negative fragment"                           |
| [`scripts/art/chibi/subjects/`](../../scripts/art/chibi/subjects/)           | Subject texts: `<FACTION>.json` for faction pieces, `SHARED.json` for terrain and resources                        |
| [`scripts/art/chibi/batches/batch-N.json`](../../scripts/art/chibi/batches/) | Batch manifest: assets (subject, class, canvas, anchor, mask override) and recipes (endpoint, size, seed, options) |
| `scripts/art/chibi/records/batch-N.json`                                     | Generation and review records (written by the pipeline)                                                            |
| `art/pixellab/submissions/`                                                  | Credential-free receipts, one flat JSON per job, as for all production art                                         |
| `art/pixellab/chibi-raw/batch-N/`                                            | Every returned candidate, lossless                                                                                 |
| `public/assets/chibi/<class>/<asset>.png`, `.mask.png`, `.body.png`          | Accepted DPR 1 masters, owner masks and tall-terrain body layers                                                   |
| `art/pixellab/reviews/chibi-batch-N/`                                        | Review evidence                                                                                                    |

## Prompt layers

Every text-to-image prompt is built from checked-in layers, in this order:

1. style (`fragments/style.txt`);
2. camera (`camera-three-quarter.txt`, or `camera-top-down.txt` for terrain);
3. faction (from `docs/art/factions/<ID>.md`; terrain, tall terrain and
   resources are faction-neutral and skip it);
4. class (`class-<class>.txt`), followed by `owner.txt` for owned assets;
5. subject (`subjects/<faction>.json`, then `SHARED.json`), plus an optional
   asset addendum;
6. an optional recipe addendum for one iteration.

Negative fragments combine in the same order, without repeated terms.
Pixen has no negative field, so the description ends with
`Must not include: …`, as in the studies. Records and receipts store every
layer's source and text, the full description, size, seed and options.

A faction swap changes only layer 3 and the subject list; a test checks it.

### Fragment changes and historical records

Fragments are live: an edit applies to every recipe not yet generated. A
generated recipe keeps the request stored in its record and receipt, which
is the exact text sent to PixelLab; `generate` never resubmits it, and
`art:validate` checks the stored bytes, receipts and masks, not the stored
text against today's fragments. `prompts` prints a generated recipe's
recorded description and lists the layers the live fragments have changed
since (`promptLayerChanges`). So accepted assets stay valid after a fragment
edit; to use new text, add a new recipe.

`owner.txt` became faction-neutral in bead `pulp_wars-bi3`. It keeps the key
colour and the owner area (about a quarter to a third of the subject, since
it also reaches settlements and buildings) and says every other material and
its shading must be clearly not red or red-brown. It no longer says "figure"
or names Human materials ("leather, wood, shields, boots and bows use
browns"), which invited brown shading on metal and bone factions. Materials
and their non-red shading belong in the faction fragment and subject lines
(see the [factions README](factions/README.md)). Batch 1 and 2 records keep
the Human-era owner text they were generated with.

## Class recipes

| Recipe class      | Endpoint                                                                    | Master                                                                                                   |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `unit`            | `create-image-pixen`, south-east, low detail                                | the candidate, generated at the master size                                                              |
| `ship`            | as `unit`, then optional edit                                               | as `unit`; a boat class text (no water, waves or plate under the hull) for ships and the embarked form   |
| `settlement`      | Pixen, then optional `edit-image-pixen`                                     | the candidate; the edit removes a plate ("Remove all ground …")                                          |
| `building`        | Pixen, then optional edit                                                   | as settlement                                                                                            |
| `crop-field`      | Pixen, then optional edit, no faction layer                                 | as settlement: an unowned field of crops registered as a building (the Farm, bead `pulp_wars-6gd.5`)     |
| `resource`        | Pixen, then optional edit                                                   | as settlement                                                                                            |
| `terrain`         | `create-image-pixflux` (flat shading) or Pixen                              | a field at least 2x the tile; the seamless 80 x 80 window is cropped, optionally inside a `cropRegion`   |
| `tall-terrain`    | Pixen, then optional edit                                                   | the transparent body drawn over an accepted ground tile's bottom cell                                    |
| `portrait`        | Pixen, `side` view, south-east, low detail                                  | the candidate: a 48 x 48 head-and-shoulders interface portrait with an owner mask (batch 5)              |
| `icon`            | Pixen, low top-down, no direction                                           | the candidate: a 48 x 48 (HUD 32 x 32) interface item sprite; also whole ships, the Catapult, the Egg    |
| `status`          | Pixen, flat camera, side view                                               | the candidate palette-mapped: a 32 x 32 board status marker                                              |
| `effect`          | Pixen, icon camera, side view                                               | the candidate palette-mapped: an ability effect sprite up to 48 x 48                                     |
| `calm-building`   | Pixen (selective outline), then optional edit; calm style, no faction layer | **seated**: the calm improvement set of the new direction                                                |
| `calm-settlement` | as `calm-building`                                                          | **seated**: cities and the Village in the calm style                                                     |
| `crop-rows`       | Pixen or Pixflux, crops on strips of soil, then edits; no faction layer     | **crop-rows**: the Farm as a seamless pattern of crop rows                                               |
| `calm-markers`    | `generate-image-v2`, chibi style, light layer, no faction layer             | **seated**: free-standing things with nothing under them (the Undead Graveyard, bead `pulp_wars-2yc.14`) |
| `calm-feature`    | as `calm-markers`, for a BUILDING or a RESOURCE                             | **seated**: one free-standing piece, with what its subject names under it (bead `pulp_wars-2yc.15`)      |

"Generate at the display size" is enforced: a non-terrain request must
equal its master canvas. Pixen sizes must be multiples of 4.

Pixen draws trees and rocks on an isometric slab just as it does cities, so
tall terrain may use the same ground-removal edit before the composite.

**Tall-terrain layers.** Accepting tall terrain also writes the body layer
`<asset>.body.png` beside the master: the accepted candidate's exact bytes.
The runtime draws a Road between the ground tile and the body (bead
`pulp_wars-yyy`), so `registry` emits `layers: { bodyUrl, groundUrl }` for
these assets. `art:validate` requires the body of every accepted
ground-composite asset, checks that its bytes match the recorded candidate
hash and the ground's bytes the recorded ground, and that the body
composited over the ground reproduces the master pixel for pixel.
`npm run art:chibi -- bodies --batch N` rewrites a batch's body layers from
its records (it backfilled batches 1 and 3).

Interface classes (batch 5) have their own camera layers
(`camera-portrait.txt`, `camera-icon.txt`) and class texts. The icon text
never says "icon", "badge" or "circle": Pixen answers "icon" with a round
badge or frame behind the object (three of the first samples), so the
recipe asks for an "item sprite" that floats alone on transparency.
Portraits are owned (`PORTRAIT:*` subjects need a mask); icons are not.

A batch is one faction, so batch 5 is split: `batch-5.json` (ORIGINAL:
Human portraits, ship portraits and every Human or shared icon),
`batch-5-undead.json` (UNDEAD: Undead portraits and the Undead command
icons), `batch-5-goblin.json` (GOBLIN: Goblin portraits, bead
`pulp_wars-0ao.8`, and the Goblin Kaboom! and WAAAGH! command icons, bead
`pulp_wars-0ao.14`) and `batch-5-dinosaur.json` (DINOSAUR: Dinosaur
portraits and the Lay Egg, Hatch, Stampede and War Drums command icons,
bead `pulp_wars-c87.7`).
The review of batch 5 shows all four.

**The Egg is an owned item sprite on the board** (bead `pulp_wars-c87.7`):
`UNIT:DINOSAUR:EGG` is a `STANDARD_UNIT` asset (48 x 48, bottom-centred,
masked) made with the `icon` recipe class, because the `unit` class text
asks for a figure with a head and feet. The icon class therefore accepts
`STANDARD_UNIT` as well as `ICON` and `PORTRAIT` assets; a unit subject is
owned, so the owner layer and the mask still apply.

**Quadrupeds** (bead `pulp_wars-c87.7`): the `unit` class with the default
south-east view stands a four-legged animal up on two legs. A recipe may set
`"options": { "view": "side", "direction": "east" }`, which with an addendum
naming a level four-legged body gave the Brontosaurus and the Triceratops.

### Building on earlier batches

- **Cross-batch edit source:** an edit recipe's `source` may name an
  earlier production batch (`{ "batch": "1", "recipe": "mountain-1-b-edit",
"candidate": 0 }`). The candidate is read from that batch's records and
  raw sheet, must match the request size, and its hash is stored in the new
  record. Batch 3 derives each Mined Mountain from the accepted batch-1
  Mountain this way, so a Mine keeps its mountain's shape. The batch may
  be numbered or named (`"batch": "goblin"`, bead `pulp_wars-3tq.8`); a
  numbered source must be earlier than a numbered batch, and batch 0 is
  never a source.
- **Cross-batch ground:** a tall-terrain `groundAsset` accepted in an
  earlier production batch is found there when the current batch has no
  such asset; the record's `derivation.ground.batch` names it.

- **Re-grounding tall terrain:** to move an accepted body to another
  ground, change the asset's `groundAsset` and run `accept` again for the
  same recipe and candidate. The master and its record are re-derived from
  the unchanged body; no PixelLab call is made. Bead `pulp_wars-6gd.5` moved
  the Mountains and Mined Mountains from `chibi-grass-1` to the rocky
  `chibi-mountain-ground-1` this way.
- **Pipeline-only ground tiles:** `chibi-mountain-ground-1` is a `TERRAIN`
  asset of batch 1 with subject `TERRAIN:MOUNTAIN` and the subject text
  `TERRAIN:MOUNTAIN/GROUND` (`subjectKey`). It is accepted and validated
  like any tile but never added to `src/assets/chibi-art-manifest.ts`,
  where it would become a flat Mountain variant; the runtime reaches it
  only as the `groundUrl` of the Mountain layers.

### Composed forests

A group of Forest cells is drawn as one forest of multi-tile pieces (bead
`pulp_wars-maw.3`). The pieces are derived, not generated:
`scripts/art/chibi-forest-pieces.ts` stamps the accepted Forest clump bodies
(`chibi-forest-1`, `-2`, and `-4`, `-5` of batch `forest-clumps`) into 20
masters under `public/assets/chibi/forest/`, and `art:validate` re-derives
them. `chibi-forest-4` and `-5` are pipeline-only stamp sources, like
`chibi-mountain-ground-1`: they are accepted and validated but not listed in
`src/assets/chibi-art-manifest.ts`. See
[COMPOSED_FORESTS.md](COMPOSED_FORESTS.md).

### Mountains as massifs

A group of Mountain cells is drawn as one mountain mass of ridges and
single mountains that fill their cells, low on the top row of an area and
tall under other Mountains (beads `pulp_wars-e9f` and `pulp_wars-2o7.1`).
The art is generated: `scripts/art/chibi-mountain-ranges.ts` has its own
recipes and records (`scripts/art/chibi/mountain-ranges/`), because the
batch pipeline generates at a class canvas and has no style-image endpoint.
It derives 27 pieces and the mined mountain under
`public/assets/chibi/mountains/`, and `art:validate` re-derives them. Since
bead `pulp_wars-2yc.1` the bake restyles every piece (slate outline, warmer
rock, cream snow, the foot cut away), mirrors nothing and fails a piece lit
from the right, and a massif cell draws its own ground (Grass, a faction's
grass, Snow) and no rocky ground. See
[COMPOSED_TERRAIN.md](COMPOSED_TERRAIN.md).

### Runtime ground fringe

Since bead `pulp_wars-2yc.1` this is the fallback only: a Mountain cell
draws the rocky ground and its fringe while the massif set loads or when it
fails to load.

The rocky Mountain ground is a square tile. Bead `pulp_wars-6gd.7` softens
its edge in the renderer, not in the pipeline, so no edge or corner tile
variants exist (a 4-edge set would need 15 tiles per profile, each
generated, reviewed and kept seamless with its neighbours).
[`chibi-terrain-fringe-v7.ts`](../../src/render/canvas/chibi-terrain-fringe-v7.ts)
is the whole rule:

- An edge of a Mountain or Mined Mountain cell is exposed when its
  orthogonal neighbour is explored land that is not a Mountain (Grass,
  Forest, any improved land). Edges against another Mountain, water, fog
  and the board edge are never cut.
- For a cell with an exposed edge the board draws the cell's Grass variant,
  then the ground tile with a binary alpha mask, then the body layer (after
  the Roads on a Road cell). The mask cuts each exposed edge back by 3 to
  14 master pixels along a ragged profile, rounds a corner between two
  exposed edges, keeps a few loose stones on the grass and darkens the rim.
  Every profile is 6 pixels deep at both ends, so a range's outline
  continues across cell boundaries.
- The profile is one of 8, chosen by a hash of the cell, so nothing
  flickers. The resolver builds each masked tile once per ground, profile
  and edge set (at most 120 rasters of 80 x 80) and draws it through the
  shared terrain part rect, so it adds no geometry of its own at any zoom
  step or device pixel ratio.
- While the ground or body layer is loading, or if pixel readback fails,
  the cell draws its square master as before. LEGACY is unchanged.

### Crop fields

The Farm is a field of grain with no building and no owner colour (bead
`pulp_wars-6gd.5`, the user's playtest note). Under the `building` class
every sample drew a farmer or a barn on a soil slab: the class text says
"one single building" and the Human faction layer names cloth, steel and
plaster. The `crop-field` class has its own text (a patch of plants in
rows, nothing under it), skips the faction layer like resources, and makes
a `BUILDING` asset with `ownerColour: false`, so no mask is extracted and
the runtime never recolours it. Pixen's south-east direction turns a field
into a small isometric diamond; the accepted recipe drops the direction
option (`"options": { "direction": null }`) and asks for a front-on
rectangle almost as wide and as tall as the image, so neighbouring Farms
read as one field. The soil slab under the wheat could not be erased by an
edit; an edit that painted it as wheat stubble worked.

### Status markers and effects

Batch `effects-undead` (bead `pulp_wars-vkq.14`) adds the `status` and
`effect` recipe classes for the board's Plague and Bitten markers and the
Undead ability effects. They skip the faction layer (bone, cloth and iron
would turn a cloud into a prop) and name their colours in the subject line.
Three findings shaped them:

- Pixen answers at 16 x 16 with noise, and Pixflux refuses canvases under
  32 x 32 (HTTP 422, now a manifest check), so markers are 32 x 32.
- Pixflux ignored these subjects: they come last in a long layered
  description. It stays allowed only for the recorded attempts.
- Pixen draws the right shapes but drifts towards the player colours (red
  gums, cyan flames) and puts effects on tiles or campfires. The `effect`
  class says "item sprite" with the icon camera, and a ground-removal edit
  (`editInstruction`) rescued the Raise Dead hands and the cure sparkles.

Their derivation is **palette-map**: every candidate pixel with alpha >= 128
becomes the nearest colour (redmean distance) of the asset's checked-in
`palette` (`scripts/art/chibi/palettes/undead-*.png`), fully opaque, and the
rest transparent, exactly what Pixflux's forced palette does server-side.
`art:validate` checks that the recorded palette is the manifest's, that its
bytes are unchanged, and that every master pixel is a palette colour.

A review of a batch whose assets are all markers or effects writes effect
sheets (each sprite on grass, forest, shallow and deep water, mountain and
the dock panel, over a Fighter of each of the four player colours, and at
zoom 0.75) and the captures `ingame-effects-{a,b}-{desktop,phone}-zoom-{1,0.75}.png`
from [`review-effects-v7.ts`](../../scripts/art/chibi/review-effects-v7.ts):
markers on units of all four colours and the cues pinned mid-animation
through `CanvasBoardHostV7.pinSupportFeedback` (scene A: Wail, Lich splash,
Plague, Lifesteal; scene B: Raise Dead, Bitten and Infect risings, cure).

### The new visual direction (bead `pulp_wars-3tq.5`)

Batch `direction-human` holds the production art of the
[new direction](VISUAL_DIRECTION_2026-10.md#12-production). It added these
pipeline pieces:

- **Style per class.** A recipe class may name another style layer:
  `calm-building` and `calm-settlement` use `fragments/style-calm.txt`
  (flat, muted, quiet behind the units) and `crop-rows` uses
  `style-crop.txt` with the `camera-crop-pattern.txt` camera (since bead
  `pulp_wars-9s0.3`: plump plants on strips of tilled soil). The chibi
  classes still use `style.txt`. The calm classes skip the faction layer:
  the improvements are one neutral set, so `class-calm-building.txt` names
  the materials, and a city names its materials in its subject line. Their
  subject texts are the `<subject>/CALM` keys (for the Farm
  `IMPROVEMENT:FARM/VEGGIES`; `/ROWS`, `/LETTUCE` and `/CABBAGE` belong to
  the retired wheat, lettuce and cabbage).
- **Fixed faction colours.** A batch with `"fixedFactionColours": true` may
  declare units, cities and portraits `ownerColour: false`: no owner layer,
  no mask, and `registry` prints `fixedColours: true`. Without the flag
  such subjects must carry the owner colour, as before.
- **`seated` derivation** (calm classes): the art is centred, seated 3 px
  above the canvas bottom (`bottomMargin`), made binary-alpha, and the
  bottom-centred window of the master size is cut. The request may be
  larger than the master (a city is generated at 96 x 96), never smaller;
  the art must fit the window.
- **`crop-rows` derivation** (the Farm): pieces of the candidate's crop
  rows (`cropRows.stamps`: here five sheaves and the plain soil between
  them) are stamped at a period that divides the tile (80 px, a sheaf every
  16 px) on rows at an even pitch (4 rows, 20 px), then calmed (saturation
  85%, 12% toward pale straw). A stamp may name its source row (`band`)
  and its tile rows (`rows`), and `rowOffsets` moves each tile row along
  itself, wrapping round the period, so rows can differ. The pattern
  continues across cell boundaries in both directions; a test checks it.
  That wheat master was retired by bead `pulp_wars-9s0.6` (the user: too
  short for wheat, too yellow for anything else) for a comparison of three
  green masters, and bead `pulp_wars-9s0.7` kept the one the user chose:
  `chibi-direction-farm`, from `veg-flux-a` (the class's only Pixflux
  recipe, imported from `art/explorations/farm-rows-2026-10/` with no new
  PixelLab call, colours unchanged). The plants of its three raised beds
  are stamped 20 px apart with plain soil columns between them. Three
  options serve it: the rows need not divide the tile height (three beds
  stand at a pitch of 80 / 3 px, rounded to whole pixels); `phase` moves
  every row down by a share of the pitch, wrapping round the tile height
  (0.5 here: a gap, not a bed, lies on the cell's centre line, and one bed
  straddles the top and bottom edges); and `trimBottom` drops lines from
  the bottom of every stamped row (unused since the cabbage was retired).
- **`retire`** removes an accepted asset that is no longer wanted (bead
  `pulp_wars-9s0.7`: the lettuce and cabbage Farms, and the veggies Farm's
  old id). First edit the batch manifest: delete the asset and bind its
  recipes to an asset that stays. Then
  `npm run art:chibi -- retire --batch N --asset ID --notes TEXT` deletes
  the master and the mask, removes the asset record, moves the recipe
  records to their new asset and turns an ACCEPTED verdict among them into
  REJECTED with the note. Recipes, raw sheets and receipts stay as history,
  so `art:validate` still passes.
- `art:validate` re-derives every seated and crop-rows master from its
  recorded candidate and fails if the bytes differ.
- **`import`** brings a recipe generated in an exploration run into a
  production batch without a PixelLab call:

  ```sh
  npm run art:chibi -- import --batch direction-human \
    --from art/explorations/human-demo-2026-10/units --ids fighter-heraldic-edit
  ```

  The record (the request exactly as sent), the raw sheet and the receipt
  are copied and the record gets `importedFrom`. The batch manifest must hold
  a recipe of the same id, endpoint, seed, size, edit instruction and edit
  source. The exploration's verdict is not carried over: review again.

### The Goblin production batch (bead `pulp_wars-3tq.9`)

Batch `direction-goblin` is the second fixed-colour batch: faction `GOBLIN`,
`fixedFactionColours`, 19 assets (8 units, 8 portraits, City 1 to 3), all
`ownerColour: false`. Its first art, described here, was retired by
[the redesign](#the-goblin-redesign-bead-pulp_wars-wrn2); these recipes
stay in the batch as history. It added no pipeline piece; it used what
`direction-human` built:

- **Every recipe is an `edit-image-pixen` edit.** Fourteen were imported
  from `art/explorations/goblin-direction-2026-10` (`import` keeps their
  chain: an imported recipe's `source` without a batch names another recipe
  of this batch, so a whole chain must be imported); the first recipe of
  each remaining chain names an accepted recipe of batch `goblin`,
  `5-goblin` or `cities-goblin` as its cross-batch source.
- **Subject texts** are the `<subject>/SCRAP` keys of
  `scripts/art/chibi/subjects/GOBLIN.json`. An edit sends only its
  instruction, so they document the look; the manifest still requires them.
- **Cities use the `settlement` class** with the classic canvases (as-is
  derivation), not `calm-settlement`: the camps keep their footprint,
  anchor and overflow, and no ground removal was needed.
- **Colours as hex values.** An edit instruction that gives the target
  colour as `#rrggbb` with its shadow tone lands within a few percent of it;
  colour words alone did not move PixelLab off orange. See the
  [production notes](VISUAL_DIRECTION_2026-10.md#what-the-goblin-batch-made).
- **Failed jobs.** A job that fails at PixelLab leaves its recipe recorded
  as submitted with its receipt (two here); give the retry a new recipe id.
- PixelLab's tier allows eight jobs at once: more concurrent `generate`
  runs are refused with HTTP 429 before a job is created, and can be rerun.

### The Goblin redesign (bead `pulp_wars-wrn.2`)

The art of the batch above was retired as too dark and **redrawn in place**
([GOBLIN.md](factions/GOBLIN.md#redesign-october-2026-lime-sand-and-hazard-paint),
[the study](factions/GOBLIN_REDESIGN.md)): the same 19 asset ids in
`direction-goblin` and the five of `naval-goblin`, accepted from new
recipes whose `accept` supersedes the earlier one (as for the three Martian
aliens). The old recipes, raw sheets and receipts stay as history;
[`before.ts`](../../scripts/art/goblin-redesign/before.ts) reads the retired
sprites from them, so no copy of the old masters is kept. It added these
pipeline pieces:

- **Fresh creations imported from the study's run.** 33 recipes of
  `art/explorations/goblin-redesign-2026-10/lime` (19 creations and 14 edits
  of them) went into `direction-goblin` and 8 into `naval-goblin` with
  `import`; three more edits were generated in the production batches. The
  assets now name the `<subject>/LIME` subject lines, the Rocket Cart and
  the Scrap Buggy use the `machine` class, the vehicle and ship portraits
  the `icon` class, and the cities the `calm-settlement` class (`seated`,
  on the classic canvases, so anchors and overflow are unchanged).
- **`goblin-hazard` accent preset**
  ([`accent.ts`](../../scripts/art/chibi/accent.ts)): the band hue 26 to 47,
  saturation at least 0.8, value at least 0.7; target hue 49 with 0.35 of
  the hue spread. PixelLab drew "hazard yellow paint" from lemon (hue 55) to
  orange gold (hue 34 to 41, 4 from the Human gold); the masters measure
  hue 46 to 58. Every Goblin asset names it except the Rocket Cart and its
  portrait, whose orange paper rocket would turn yellow. The other presets
  are unchanged (the preset-name test lists five).
- **`bottomMargin` on an as-is class** asks for the `seated` derivation: the
  art is moved by whole pixels until it is centred and its lowest opaque row
  sits that many pixels above the canvas bottom. A fresh creation of a ship
  floats wherever Pixen draws it (the Patrol Boat came 5 px above the
  waterline); the three Goblin ships name the shared ships' margins (8, 11
  and 13). Only for unowned assets (a mask is cut from the candidate as
  drawn). `art:validate` re-derives such a master like any seated one.
- **[`candidates.ts`](../../scripts/art/goblin-redesign/candidates.ts)**
  lays any PNGs (or the candidates of a raw sheet, `file.png#2`) out at x4
  on Grass, at 1x on Grass, Snow and Mountain ground and in greyscale, with
  mean L\*, the dark and lit shares, the outline share and the hazard-yellow
  share under each: the review of a candidate before `accept`.

What worked is in
[GOBLIN.md](factions/GOBLIN.md#how-it-was-made): name the colour PixelLab
already drew when recolouring skin, remove a beard with "Change only one
thing", never ask for "yellow-lime", and name one small part per edit.

`npm run art:chibi-direction-review -- --goblin-only` still writes
`art/pixellab/reviews/chibi-batch-direction-goblin/`; its "new" columns and
captures now show the redesign beside the classic sprites.

### The accent step and the palette swap (bead `pulp_wars-3tq.12`)

Batch `direction-undead` holds the
[Undead production art](VISUAL_DIRECTION_2026-10.md#17-undead-production)
of the new direction (`"fixedFactionColours": true`, every unit, portrait
and city `ownerColour: false`). It added two pipeline pieces:

- **`accent`**: an asset may name an accent preset of
  [`accent.ts`](../../scripts/art/chibi/accent.ts) (`"accent":
"undead-violet"`). After the class derivation (`as-is` or `seated`), the
  sprite's accent pixels are found by colour (the preset's HSV band: the
  magenta that PixelLab draws for "bright violet") and recoloured: the hue
  moves to the preset's hue, and a pixel of thin trim on dark cloth (few
  accent neighbours, several dark ones) is lightened. Every other pixel is
  copied. The record stores the preset whole (`derivation.accent`: name,
  spec, accent and trim pixel counts). `art:validate` re-derives the master
  from the recorded candidate and the preset and fails if a byte differs,
  or if the manifest and the record name different presets. An accent is
  only for fixed-colour assets (an owner mask is cut from the key red, which
  a recolour must never touch).
- **Palette swap** (`palette-map` classes): an asset with `paletteFrom`
  maps its candidate to that palette first and then replaces each colour by
  the colour at the same position in `palette`; the two palettes must have
  the same number of colours. With `paletteRecipe` the asset takes the
  candidate of another asset's recipe (same subject and size) and needs no
  recipe of its own: `accept --id <recipe> --candidate K --asset <id>`. The
  four violet effects (`chibi-direction-effect-{wail,splash,raise,wisp}` in
  batch `effects-undead`) are the accepted effect sprites swapped from
  `undead-frost.png` to `undead-violet.png`, so their shapes are the
  reviewed ones and no PixelLab call is made. `art:validate` re-derives
  them too. `npx tsx scripts/art/undead-direction/violet-palette.ts` writes
  the violet palette from the list in that file; a test checks the bytes.

Its cities use the `calm-settlement` class with the subject keys
`CITY:UNDEAD:<level>/CALM`; its units and portraits are `edit-image-pixen`
chains on the accepted `undead` and `5-undead` candidates, with seven study
recipes brought in by `import`.

### The Dinosaur production batch (bead `pulp_wars-3tq.13`)

Batch `direction-dinosaur` holds the
[Dinosaur production art](VISUAL_DIRECTION_2026-10.md#19-dinosaur-production):
faction `DINOSAUR`, `fixedFactionColours`, 23 assets (8 units, the Egg, 8
portraits, 3 command icons, City 1 to 3), every unit, portrait and city
`ownerColour: false`. It added no pipeline piece:

- **Every recipe is an `edit-image-pixen` edit** of an accepted classic
  candidate (batches `dinosaur`, `5-dinosaur`, `cities-dinosaur`) or of an
  earlier step. Nine were imported from
  `art/explorations/dinosaur-direction-2026-10`: the whole chains of the
  study's variant F for the Raptor and the T-Rex, whose last steps are the
  accepted sprites, and the two steps of its spotted Caveman.
- **No accent step.** The user kept the red-orange PixelLab draws, and its
  hue is steady from sprite to sprite (21° to 29° on the units), so no
  asset names an `accent` preset: every master is its recorded candidate
  (`as-is`), which a test checks byte for byte.
- **The Egg** keeps the classic arrangement: a `STANDARD_UNIT` of 48 x 48
  made with the `icon` recipe class, here unowned.
- **Subject texts** are the `<subject>/PRIMAL` keys of
  `scripts/art/chibi/subjects/DINOSAUR.json`. An edit sends only its
  instruction, so they document the look; the manifest still requires them.
- **Cities use the `settlement` class** with the classic canvases (as-is),
  like the Goblin camps: the edits keep each camp's footprint.
- **An interrupted job.** One job was submitted when the network failed
  (`portrait-dinosaur-shaman-robe-edit`). As for a job that fails at
  PixelLab, its recipe stays recorded as submitted with its receipt, and
  the retry has a new recipe id; the pipeline has no resume for a job
  whose polling was cut off.
- The prompt notes are in the
  [production section](VISUAL_DIRECTION_2026-10.md#what-was-made-2).

## Terrain palettes and variants

- **Forced palette:** a Pixflux recipe may name a checked-in PNG in
  [`scripts/art/chibi/palettes/`](../../scripts/art/chibi/palettes/) as
  `colorImage` (path and SHA-256). It is sent as PixelLab's `color_image`,
  and every output pixel uses its colours exactly. PixelLab maps each drawn
  colour to its nearest palette entry, so a palette with close tones lets
  the base colour land on different entries from seed to seed. Two-tone
  palettes (base plus one far-off accent) keep the base stable.
- **Variants that join:** variants of one terrain must share their base
  colour, or a mixed map shows a patchwork. An asset may set `cropRegion`
  (the part of the field searched for the seamless window). With
  `fieldRecipe` it takes its window from another variant's accepted field:
  `accept --id <recipe> --asset <variant>`. Pixflux is not deterministic
  per seed, so a repeated request is not a way to get the same field.

## Resource variants

Batch `resource-variants` (bead `pulp_wars-glz`) adds a Boar and a Rabbit
to `RESOURCE:GAME` and a Blueberry shrub and a Pear tree to
`RESOURCE:FRUIT`. An asset's `subjectKey` (`<subject>/<VARIANT>`, for
example `RESOURCE:GAME/BOAR`) names the subject text in `SHARED.json` that
replaces the subject's own, so a variant that depicts something else is
still registered under its subject. The runtime registers them after the
batch-3 Deer and Peach Tree, and `chibiVariantV7` picks one per tile from
its coordinates, the same hash as terrain and the LEGACY Game and Fruit
variants. A review of a batch whose subjects are all resources captures
the resource field of
[`review-scene-v7.ts`](../../scripts/art/chibi/review-scene-v7.ts): Game on
Forest and Fruit on Grass in runs of three, with a Fighter of each of the
four player colours.

Batch `fish-variants` (bead `pulp_wars-2yc.16`, the user: "generate a few
different fish variants") adds three rasters to `RESOURCE:FISH` after the
batch-3 leaping fish, on the same 40 x 40 canvas centred on the cell: a
shoal of three (`RESOURCE:FISH/SHOAL`), a pair leaping apart out of one
splash (`RESOURCE:FISH/PAIR`) and a fish diving into a splash
(`RESOURCE:FISH/DIVE`). With four variants the hash gives every Shallow
Water tile one of them, never the same one as the tile beside or below it.
The interface asks without a tile and keeps the first fish. The `resource`
class sends no light layer, so each recipe states the south-west light in
its addendum. `scripts/art/lighting-qa.ts` calls the dive, the pair and the
first fish lit from the left; it calls the shoal lit from the right, which
is local colour (the dark blue backs are on the left of the fish and their
yellow faces on the right), not shading. Rejected on the way: fish on a
grass block or a pond island, two upright fish that read as long-haired
figures, a whale-like body, an orange-red goldfish and fish under about
24 px. The batch has no in-game capture of its own in
`art/pixellab/reviews/chibi-batch-fish-variants/` (the resource field of the
batch review holds Game and Fruit); `scripts/art/resource-review.ts`
captures Fish on shallow and deep water, and the Gallery's Water detail
lists every Fish variant on Shallow Water and shows all four on its sample
board.

## Owner masks

Owned assets (units, cities, and improvements that opt in) get a
deterministic mask in [`owner-mask.ts`](../../scripts/art/chibi/owner-mask.ts):

- **Extraction:** opaque pixels with hue 340–5, saturation >= 0.65 and value
  > = 0.30 (the key `#d8262c` and its shades); components under 3 pixels are
  > dropped as speckle.
- **QA failures:** mask pixels on transparency, on red-brown material (hue
  above 5 up to 15, saturation >= 0.45, value >= 0.30), not a shade of the
  key, or embedded in red-brown material (5 of 8 neighbours); red-brown
  material above 3% of opaque pixels; owner coverage below 15% or above 55%.
  Coverage outside the direction's 20–40% target is recorded.
- **Override:** a hand-corrected PNG (production overrides live in
  [`scripts/art/chibi/overrides/`](../../scripts/art/chibi/overrides/)) named in the asset's `maskOverride`,
  bound to the master's pixel hash, with a written reason. It passes the
  same QA; it may waive only `RED_BROWN_MATERIAL`, `COVERAGE_LOW` or
  `COVERAGE_HIGH`.

An asset whose art passes review but whose mask fails QA is recorded as
`MASK_REJECTED` and must not be registered.

## Workflow for a batch

```sh
npm run art:chibi -- plan --batch 1
npm run art:chibi -- prompts --batch 1 --id fighter-a
npm run art:chibi -- generate --batch 1 --ids fighter-a,fighter-b   # PixelLab calls
npm run art:chibi -- reject --batch 1 --id fighter-b --notes "shield is red-brown"
npm run art:chibi -- accept --batch 1 --id fighter-a --candidate 0 --notes "..." \
  --native-pass --enlarged-pass --owners-pass --no-plate-pass --camera-pass
npm run art:chibi -- registry --batch 1   # lines for src/assets/chibi-art-manifest.ts
npm run art:chibi-batch-review -- --batch 1
npm run art:validate
```

Generation prints a plate hint for suspect candidates; it is a heuristic
and never replaces looking. Review each candidate at 1:1 and x4 before
accepting. Register only `ACCEPTED` assets; a test checks every registry
entry against the records.

### Concurrent runs

`accept` and `reject` may run while a long `generate` of the same batch is
waiting on PixelLab (bead `pulp_wars-28w`). Every records write goes
through `updateRecords`: it takes the exclusive lock file beside the
records (`records/.batch-N.lock`; `.records.lock` for dry and exploration
runs), re-reads the file, changes only its own entries and replaces the
file atomically, with the same sorted bytes as before. So:

- `generate` writes only its recipe's entry, at submission and at
  completion, and keeps the verdicts and recipes other runs recorded in
  the meantime.
- `accept` and `reject` hold the lock from reading the records to writing
  them (for `accept` also while it writes the master, mask and body), so
  two verdicts serialize as if run one after the other.
- A true conflict fails loudly and writes nothing: `generate` refuses to
  record a submission when the recipe already has a record (another run
  generated it meanwhile; the late job's receipt is kept for recovery), or
  to complete one whose record another run changed.

A live lock is waited for up to 60 s, then the command fails naming the
lock file. A lock left by a crashed run is broken when its process is gone
(same host) or when it is older than 10 minutes. Lock files and
`*.json.<pid>.<uuid>.tmp` write files are git-ignored and never committed.

## Review evidence

`npm run art:chibi-batch-review -- --batch N` writes to
`art/pixellab/reviews/chibi-batch-N/`: 1:1 and x4 sheets for owners A (Coral)
and B (Teal) through the runtime recolour, exact 1170 x 2532 phone and
1440 x 900 desktop mocks, in-game captures with `?art=chibi` at zoom 1 and
0.75 on desktop and phone, `phone-links.md` with raw GitHub URLs, and
`index.json`. Captures start Vite on port 6175 (never 6173; `--port N`
picks another) unless a URL is given, and need `CHROME_PATH`.
`--skip-capture` skips them.

From batch 3 on, a batch without terrain of its own is reviewed on the
accepted terrain of earlier batches, water pieces (Fish, Pearls, Port,
ships) stand on shallow water in the sheets and mocks, and the captures add
`ingame-scene-{desktop,phone}-zoom-{1,0.75}.png`: the synthetic showcase in
[`review-scene-v7.ts`](../../scripts/art/chibi/review-scene-v7.ts), which
rewrites a 9 x 7 patch around the capital of the running game (every
resource and improvement, Farm pairs, Mines, Ports with Fish, Roads with
corner joins, Field Defense and a fortification level, Treasure, two
owners) and draws it with the real board host, since a fresh game's start
area shows almost none of them.

When a batch has unit or improvement subjects the showcase does not draw
(batch 4's processors, Shipyard, ships and embarked form), the same module
builds a 9 x 5 roster instead: the batch's land pieces for the viewer and a
rival, a Fighter per owner beside the capital for scale, then its water
pieces (docks on Shallow Water, the viewer's ships on Shallow Water and the
rival's on Deep Water). The roster's rival is drawn as Undead, so the skull
badge, the base plate and the damaged HP bar are checked on every unit
class (the review scenes draw the default look since bead `pulp_wars-3tq.6`).
The
captures keep the `ingame-scene-*` names; `index.json` labels each as a
showcase or a roster.

A Goblin unit roster (`UNIT:GOBLIN:<ROLE>`, batch `goblin`) is drawn like
an Undead one, with a Goblin viewer and rival and an extra Human seat for
the scale Fighter. `npm run art:chibi-goblin-review` (bead
`pulp_wars-0ao.8`) runs the batch review of batch `goblin` and adds
`faction-units-{1x,x4}.png` and `faction-portraits-{1x,x4}.png` (every Goblin
unit and portrait beside the Human and Undead one of its role, in the key
colour and the four player colours, with the mask at x4) and
`goblin-match-*.png` captures of a fresh Goblin-vs-Undead match in CHIBI
(board at zoom 1 and 0.75 on desktop and phone, the unit dock, the training
dock and the technology tree), indexed in `goblin-index.json`. Its captures
start Vite on port 6301 unless `--port` says otherwise. Since bead
`pulp_wars-3tq.9` the default look draws the Goblin production art, so the
`ingame-*` and `goblin-match-*` captures show it, and the faction sheets
put the live sprite (and the live Human one) beside the classic sprite in
the key colour and the four player colours; the batch review's own sheets
and mocks still show the classic, masked batch.

`npm run art:chibi-dinosaur-review` (bead `pulp_wars-c87.7`) writes
`art/pixellab/reviews/chibi-batch-dinosaur/`:
`faction-units-{1x,x4}.png` and `faction-portraits-{1x,x4}.png` (every
Dinosaur unit and portrait beside the Human, Undead and Goblin one of its
role, in the key colour and the four player colours, with the mask at x4),
`faction-units-zoom-0.75.png` (the 1:1 sheet at zoom step 0.75),
`cities-{1x,x4}.png` (City 1-3 of the four factions),
`icons-{1x,x4}.png` (Lay Egg, Hatch, Stampede and War Drums beside the
existing command icons on the dock panel and a light page),
`egg-{1x,x4}.png` (the Egg beside the Caveman and the Raptor),
`showcase-{desktop,phone}-zoom-{1,0.75}.png`, `showcase-dock-desktop.png`
and `showcase-tech-desktop.png` (a Showcase match with a Dinosaur viewer
against a Human, an Undead and a Goblin seat, launched from the setup
form), `ingame-roster-{desktop,phone}-zoom-{1,0.75}.png` (the
scene of
[`review-dinosaur-scene-v7.ts`](../../scripts/art/chibi/review-dinosaur-scene-v7.ts)
drawn by the real board host: the eight units and the Egg in the four
player colours, on base plates and with the damaged HP bar, beside the other
three factions) and `dinosaur-index.json`. Its captures start Vite on port 6431
unless `--port` says otherwise. It does not run the batch review. Since bead
`pulp_wars-3tq.13` the default look draws the Dinosaur production art, so
the `showcase-*` and `ingame-roster-*` captures show it, and the faction
sheets have a "Live" column (the production piece, the same for every
player) before the classic piece in the key colour and the four player
colours; the Human, Undead and Goblin columns stay the classic sprites in
Coral.

The faction city sets (`CITY:UNDEAD:<level>`, `CITY:GOBLIN:<level>`, batches
`cities-undead` and `cities-goblin`, bead `pulp_wars-6gd.6`) have their own
command, `npm run art:chibi-faction-cities-review`, which writes
`art/pixellab/reviews/chibi-faction-cities/`: `cities-{1x,x4}.png` (City 1–3
of the Human, Undead and Goblin sets side by side in the four player
colours), `garrison-{1x,x4}.png` (key colour, mask, and each city with its
faction's standard and large unit garrisoned as the runtime places them),
`ingame-cities-{desktop,phone}-zoom-{1,0.75}.png` (the scene of
[`review-cities-v7.ts`](../../scripts/art/chibi/review-cities-v7.ts): a
column of level 1, 2 and 3 cities per faction with territory borders,
garrisons, a capital crown and a City Wall badge, drawn by the real board
host), `match-*.png` (fresh matches as an Undead and as a Goblin viewer,
with the city dock) and `index.json`. Its captures start Vite on port 6361.
With `--preview <batch>:<recipe>[:candidate],… --out <scratch dir>` it lays
raw candidates out the same way before acceptance and prints their mask QA.

Interface batches (every asset a `PORTRAIT` or `ICON`, batch 5) get
interface sheets instead: each portrait or icon on the dark dock panel in
the key colour and for owners A and B, its mask, on a light page, at the
1.5x card size and at the half size of inline HUD text. The terrain mocks
are skipped, and the captures add `dom-<scene>-{desktop,phone}.png` from
[`review-dom-v7.ts`](../../scripts/art/chibi/review-dom-v7.ts): a real
`Ruleset7DomAppView` with `?art=chibi` over a fixture arena, opened on a
Human and an Undead unit dock, an Undead rival's dock, Human and Undead
training docks, the technology tree with a card's detail, and the
mandatory rewards (Survey and City Wall, Stockpile and Boom, and the
Undead unit rewards). A review of batch `N` also includes its faction
companions `N-<name>` (batch 5 includes `5-undead`).

`npm run art:chibi-playtest3-review` (beads `pulp_wars-6gd.5` and
`pulp_wars-6gd.7`) writes
`art/pixellab/reviews/chibi-playtest-3-art/`: `sheet-{1x,x4}.png` (the
fireworks Rocket Cart beside the Goblin units and the Human Catapult, in
the key and player colours with its mask and portrait; the grain-field
Farm alone, in a 3 x 3 block and beside Windmills; the rocky ground tile,
the Mountain and Mined Mountain masters and a range with Ore and Mines
beside Grass, Forest and water) and
`ingame-{rocket,farms,mountains,mountain-edges,mountain-block}-{desktop,phone}-zoom-{1,0.75}.png`
(the last two show the runtime ground fringe: a lone Mountain, an L-shaped
range, a 3 x 3 block, and Mountains beside water, Forest, Roads and fog), the
scenes of
[`review-playtest3-scene-v7.ts`](../../scripts/art/chibi/review-playtest3-scene-v7.ts)
drawn by the real board host. Its captures start Vite on port 6351 unless
`--port` says otherwise.

`npm run art:chibi-direction-review` (bead `pulp_wars-3tq.5`) writes
`art/pixellab/reviews/chibi-batch-direction-human/`:
`units-old-new-{1x,x4}.png` and `units-zoom-0.75.png` (every Human unit,
today's sprite beside the new one and the Undead, Goblin and Dinosaur unit
of its role), `portraits-old-new-{1x,x4}.png`,
`improvements-old-new-{1x,x4}.png` (the ten improvements, the Village and
the Mine), `cities-{1x,x4}.png` (three tiers, with the pennant at its
recorded anchor), `farm-x4.png` (the Farm tile and a 3 x 3 block of it),
`showcase-{human,mixed}-{desktop,phone}-zoom-{1,0.75}.png` (a real Showcase
match in the default look: every seat Human, and the four factions),
`showcase-human-today-desktop-zoom-1.png` (the same match with the Classic
look developer option on),
`showcase-human-{dock,tech}-desktop.png`,
`ingame-farms-{desktop,phone}-zoom-{1,0.75}.png` (the `FARMS` patch of
`scripts/art/visual-direction/scene.ts` drawn by the real board host with
the game's own art: a 3 x 3 Farm block over Roads, single Farms beside
cities and buildings, a 5 x 3 field under units) and `index.json`.
Its captures start Vite on port 6471 unless `--port` says otherwise. With
`--farms-only --out DIR` it writes only the four `ingame-farms-*` captures
into DIR, to try a Farm candidate copied over the master.

The same command (bead `pulp_wars-3tq.9`) also writes
`art/pixellab/reviews/chibi-batch-direction-goblin/`, alone with
`--goblin-only`: `units-old-new-{1x,x4}.png` and `units-zoom-0.75.png`
(every Goblin unit: classic in the key colour and in Coral, new, and the
new Human, the Undead and the Dinosaur unit of its role),
`portraits-old-new-{1x,x4}.png`, `cities-{1x,x4}.png` (classic, new, new
with the pennant at its recorded anchor, the Human city),
`showcase-goblin-{desktop,phone}-zoom-{1,0.75}.png` (a Showcase match in
the default look with a Goblin viewer against a Human, an Undead and a
Dinosaur seat), `showcase-goblin-four-*` (four Goblin seats),
`showcase-goblin-today-desktop-zoom-1.png` (the Classic look),
`showcase-goblin-{dock,tech}-desktop.png`,
`ingame-goblin-{roster,mixed}-{desktop,phone}-zoom-{1,0.75}.png` (the
`ROSTER` and `MIXED` scenes of `scripts/art/goblin-direction/scene.ts`
drawn by the real board host with the game's own art: four Goblin players
with the whole roster and a garrisoned city of each tier, and Goblin
against Human) and `index.json`. In the Human sheets the Goblin column is
the live Goblin unit.

`npm run art:goblin-direction-study-review` (bead `pulp_wars-3tq.8`) writes
`art/pixellab/reviews/goblin-direction-study/`, the evidence of the
[Goblin direction study](VISUAL_DIRECTION_2026-10.md#14-goblin-study):
`candidates-x3.png` (every candidate of the exploration run with its
verdict), `chosen-{1x,x4}.png`, `alternatives-x4.png`,
`palette.{png,json}` and `readability.json` (measured on the sprites),
`before-after-{four,mixed}-{desktop,phone}-zoom-{1,0.75}.png` and
`same-unit-{desktop,phone}-zoom-{1,0.75}.png` (the scenes of
[`scene.ts`](../../scripts/art/goblin-direction/scene.ts) drawn by the real
board host with the default look) and `index.json`. Its captures start Vite
on port 6481 unless `--port` says otherwise; the full-screen captures go to
`--captures DIR` (a temporary directory by default). It reads the samples
that `npx tsx scripts/art/goblin-direction/samples.ts` cuts from the run.
Its "today" panels keep drawing the classic Goblin sprites: the study scene
passes the Human production art plus the study's samples as the direction
art, not the live registry, which now holds the Goblin production art.

`npm run art:chibi-undead-direction-review` (bead `pulp_wars-3tq.12`)
writes `art/pixellab/reviews/chibi-batch-direction-undead/`:
`units-old-new-{1x,x4}.png` and `units-zoom-0.75.png` (every Undead unit:
today's sprite in the key colour and for a Teal player, the new one on
Grass, Forest and Mountain, and the Human unit of its role),
`portraits-old-new-{1x,x4}.png` (the eight portraits and the four command
icons), `cities-{1x,x4}.png` (City 1-3: today, new with the pennant at its
recorded anchor, and the Human city), `effects-old-new-x4.png` (the four
effects in the classic and the violet palette, and the markers that are not
converted), `palette.{png,json}` and `readability.json` (measured on the
masters), `setup-{desktop,phone}.png`,
`showcase-undead-{desktop,phone}-zoom-{1,0.75}.png` (a Showcase match with
an Undead viewer against Human, Goblin and Dinosaur),
`showcase-undead-classic-desktop-zoom-1.png` (the same match with the
Classic look on), `showcase-undead-{dock,train,tech,help}-desktop.png`,
`scene-{four,mixed}-{desktop,phone}-zoom-{1,0.75}.png`,
`scene-four-classic-desktop-zoom-1.png` and
`scene-magic-{raise-preview,wail-preview,cues,cues-b}-{desktop,phone}-zoom-{1,0.75}.png`
(the scenes of
[`review-undead-direction-scene-v7.ts`](../../scripts/art/chibi/review-undead-direction-scene-v7.ts)
drawn by the real board host: four Undead players, Undead against Human,
and the Raise Dead and Wail previews and the ability cues pinned
mid-animation) and `index.json`. Its captures start Vite on port 6501
unless `--port` says otherwise.

`npm run art:chibi-dinosaur-direction-review` (bead `pulp_wars-3tq.13`)
writes `art/pixellab/reviews/chibi-batch-direction-dinosaur/`:
`units-old-new-{1x,x4}.png` and `units-zoom-0.75.png` (every Dinosaur unit:
today's sprite in the key colour and for a Teal player, the new one on
Grass, Forest, Mountain and beside Shallow and Deep Water, and the Human,
Undead and Goblin unit of its role), `portraits-old-new-{1x,x4}.png` (the
eight portraits beside the map sprite and the other factions' busts, and
the command icons), `cities-{1x,x4}.png` (City 1-3: today in the key colour
and for a Teal player, new, new with the pennant at its recorded anchor,
and the Human, Goblin and Undead city), `egg-old-new-{1x,x4}.png` (the Egg
today and new, beside the Caveman), `palette.{png,json}` and
`readability.json` (measured on the masters),
`showcase-dinosaur-{desktop,phone}-zoom-{1,0.75}.png` (a Showcase match
with a Dinosaur viewer against Human, Undead and Goblin: the four converted
factions), `showcase-dinosaur-four-{desktop,phone}-zoom-{1,0.75}.png` (four
Dinosaur seats), `showcase-dinosaur-classic-desktop-zoom-1.png` (the mixed
match with the Classic look on),
`showcase-dinosaur-{dock,lay,tech,help}-desktop.png`,
`scene-{four,mixed}-{desktop,phone}-zoom-{1,0.75}.png` and
`scene-four-classic-desktop-zoom-1.png` (the scenes of
[`review-dinosaur-direction-scene-v7.ts`](../../scripts/art/chibi/review-dinosaur-direction-scene-v7.ts)
drawn by the real board host: four Dinosaur players with the eight units on
Grass, Forest and Mountain, a city of each tier with a garrison, Eggs with
countdowns, Big and Alpha units and a row on the shore; and Dinosaur
against Human, Undead and Goblin, unit by unit) and `index.json`. Its
captures start Vite on port 6508 unless `--port` says otherwise;
`--dinosaur-only` is accepted and changes nothing. The Charge!, Hatch, Acid
and Armoured previews and cues on the new sprites are captured by
`npm run review:ruleset7-dinosaur-ui`. **Do not edit files of the worktree
while a capture runs:** the dev server reloads the page and the run waits
for ever.

## Dry run

Batch 0 is a fixture batch. `npm run art:chibi-batch-review -- --batch 0
--dry-run` (or `npm run art:chibi -- dry-run --batch 0`) runs every step with
the tile-80 study's checked-in candidates instead of PixelLab: prompt
layering, request bodies, receipts, the plate rejection and ground-removal
edit of the city, the seamless grass crop, and masks. It asserts the
expected outcomes: the tile-80 Fighter's mask is rejected (red-brown shield,
10.5% owner area), and the Marksman passes only through its checked-in
override. Its outputs stay in `art/pixellab/reviews/chibi-batch-0/dry-run/`
and are never registered.

## Exploration runs

An exploration run calls PixelLab through the same layering, but keeps
everything in one directory under `art/explorations/` and never registers
anything. `plan`, `prompts`, `generate`, `accept` and `reject` take
`--exploration <dir>` in place of `--batch N`:

```sh
npm run art:chibi -- prompts --exploration art/explorations/faction-layer-dry-run/materials-motifs-only
npm run art:chibi -- generate --exploration art/explorations/faction-layer-dry-run/materials-motifs-only --ids fighter-a
```

The directory holds `batch.json` (a batch manifest), `faction.md` (a
faction document whose id must be `TEST-<NAME>`), `subjects.json`, and the
run's `records.json`, `submissions/`, `raw/` and `assets/`. A `TEST-`
faction is refused if it also exists in `docs/art/factions`, and
`art:validate` rejects any `TEST-` faction there. The faction-layer dry run
([factions README](factions/README.md#dry-run-test-clockwork-bead-pulp_wars-tt31))
is the first exploration run.

**Trying another style** (bead `pulp_wars-3tq.3`): a run may carry its own
`fragments/` directory. A file there replaces the production fragment of the
same name for that run only: `style.txt`, `owner.txt`, `camera-<name>.txt`
and `class-<name>.txt`, each with its `.negative.txt` where the production
fragment has one. Records and receipts store every layer's source and text,
so the request stays reproducible; production batches never read these
files, and a test checks that another run and the production library are
unchanged. The Human demo of the
[visual-direction study](VISUAL_DIRECTION_2026-10.md#11-human-demo) uses it
for its flatter building style and its top-down Farm
(`art/explorations/human-demo-2026-10/`).

Buildings may also be generated with `create-image-pixflux`
(default options: selective outline, flat shading, low detail), the only
endpoint with a shading option. The demo's four Pixflux samples ignored the
subject and drew ground plates, so every accepted building still comes from
Pixen.

## Undead direction study review

`npm run art:undead-direction-study-review` (bead `pulp_wars-3tq.11`) writes
`art/pixellab/reviews/undead-direction-study/`, the evidence of the
[Undead direction study](VISUAL_DIRECTION_2026-10.md#15-undead-study):
`candidates-x3.png`, `options-{1x,x4}.png` (today's sprite in the four
player colours, the violet, cyan and green options and the Human unit of
the role), `terrain-x3.png`, `alternatives-x4.png`, `markers-x4.png` (the
existing Undead markers and effects beside the accents),
`palette.{png,json}` and `readability.json` (measured on the sprites),
`scene-{four,mixed}-{desktop,phone}-zoom-{1,0.75}.png` and
`same-unit-{desktop,phone}-zoom-{1,0.75}.png` (the scenes of
[`scene.ts`](../../scripts/art/undead-direction/scene.ts) drawn by the real
board host with the default look) and `index.json`. Its captures start Vite
on port 6491 unless `--port` says otherwise; the full-screen captures go to
`--captures DIR` (a temporary directory by default). It reads the samples
that `npx tsx scripts/art/undead-direction/samples.ts` cuts from the run
and derives: each accent option is its unit's base candidate with the
accent pixels remapped by
[`accent.ts`](../../scripts/art/undead-direction/accent.ts), recorded per
asset in the run's `samples.json`.

## Dinosaur direction study review

`npm run art:dinosaur-direction-study-review` (bead `pulp_wars-3tq.14`)
writes `art/pixellab/reviews/dinosaur-direction-study/`, the evidence of the
[Dinosaur direction study](VISUAL_DIRECTION_2026-10.md#18-dinosaur-study):
`candidates-x3.png`, `variants-{x4,1x,0.75x}.png` (today's sprite in two
player colours, the variants A to F and the live Human, Undead and Goblin
unit of the role, enlarged, at native size and resampled to zoom 0.75),
`terrain-x2.png`, `alternatives-x4.png`, `palette.{png,json}` and
`readability.json` (measured on the sprites),
`scene-{four,mixed}-{desktop,phone}-zoom-{1,0.75}.png`,
`shore-{desktop,phone}-zoom-{1,0.75}.png` and
`same-unit-{desktop,phone}-zoom-{1,0.75}.png` (the scenes of
[`scene.ts`](../../scripts/art/dinosaur-direction/scene.ts) drawn by the
real board host with the default look) and `index.json`. Its captures start
Vite on port 6492 unless `--port` says otherwise; the full-screen captures
go to `--captures DIR` (a temporary directory by default). It reads the
samples that `npx tsx scripts/art/dinosaur-direction/samples.ts` cuts from
the run: each variant is one recorded candidate as generated, and
`samples.json` records how far each pattern edit moved its plain base.

## The Martian batch (bead `pulp_wars-t6s.6`)

Batch `direction-martian` holds the production art of a fifth faction, the
[Martians](factions/MARTIAN.md): faction `MARTIAN`, `fixedFactionColours`,
33 assets (nine units, nine portraits, seven icons, five effects, City 1 to 3) from 62 recipes, all new PixelLab calls. The faction had no accepted
sprite to edit, so the batch starts from fresh creations. **Nothing
registers it yet:** its registry lines are in
[`chibi-direction-martian-art-manifest.ts`](../../src/assets/chibi-direction-martian-art-manifest.ts),
which no module imports until bead `pulp_wars-t6s.4`. It added these
pipeline pieces:

- **`machine` recipe class**: the sizes, camera, options and faction layer of
  `unit`, with a class text (`class-machine.txt`) that asks for "one chunky
  cute toy-like machine map piece" instead of a figure with "a big head …
  both feet visible". The Saucer, the Tripod, the Mothership, the Colossus
  and the Brain's carrier use it. Fresh creations with it keep the thick
  black outline and the chunky shapes of the chibi look.
- **Sibling edits** (`"source": { "recipe": …, "candidate": …, "sibling":
true }`): an `edit-image-pixen` recipe may edit an earlier recipe of
  **another asset of the same batch**, of the same size. Without `sibling`
  an in-batch source must still belong to the recipe's own asset. The Ray
  Gunner and the Shield Projector are edits of the accepted Grunt, the
  Mothership of the accepted Saucer, and two portraits of the Grunt's bust,
  so the aliens share one head, helmet and suit. A fresh creation of the
  Ray Gunner drew a different alien.
- **`martian-magenta` accent preset**
  ([`accent.ts`](../../scripts/art/chibi/accent.ts)): the band hue 285 to
  350, saturation at least 0.4, value at least 0.25; target hue 322 with a
  fifth of the hue spread and no trim rule. PixelLab's "hot magenta pink"
  ranged from hue 300 to 340 between sprites; the masters measure 320 to 324. The `undead-violet` preset is unchanged (a test holds it).
- **Subjects**: `UNIT:MARTIAN:<ROLE>` (and `UNIT:MARTIAN:THRALL`, retired
  with its portrait by bead `pulp_wars-b5f.3`; its recipes stay as history),
  `PORTRAIT:MARTIAN:<ROLE>`, `CITY:MARTIAN:<level>`,
  `ICON:ACTION:MARTIAN:RALLY` (Psychic Command), and a new family
  `ICON:STATUS:SHIELD` and `ICON:STATUS:COOLING`.
- **Effects** are `palette-map` assets on
  `scripts/art/chibi/palettes/martian-magenta.png`, written by
  `npx tsx scripts/art/martian-direction/magenta-palette.ts` (a test checks
  the bytes).

What worked, added to the prompt notes of the earlier batches:

- **A fresh figure holds the chibi proportions** when its subject line says
  "a huge round head about half of the figure's height and a tiny sturdy
  body" (the Grunt is 54 x 73 px, the Human Fighter 52 x 72).
- **Derive the second and third figure by editing the first** ("Change only
  what he holds: …; Keep his head, big black eyes, glass bubble helmet, …").
- **A flyer is made by removing its legs**: every saucer creation drew
  landing legs; "Remove the four legs under the saucer, so it flies with
  nothing under it except …" worked first time.
- **"Change only one thing: erase the pointed horn …; do not redraw
  anything else"** removed a stray horn; an edit that asked for two things
  (a leg and the horn) removed the eye lens instead.
- **Scenery behind an effect** is removed by an edit that names what stays
  ("erase everything except the tall pink column of light and the magenta
  ring at its foot").
- **What did not work:** making the Tripod stand on three legs (it stands
  on four), and recolouring cyan leg segments of a 48 px portrait (a fresh
  creation with "cyan, teal" excluded replaced it).

`npm run art:chibi-martian-direction-review` writes
`art/pixellab/reviews/chibi-batch-direction-martian/`:
`roster-{x4,1x}.png` and `roster-zoom-0.75.png` (the nine units on Grass
and on Mountain rock, beside the Human, Undead, Goblin and Dinosaur unit of
the role), `terrain-x2.png` (every unit on Grass, Forest, Mountain, Shallow
and Deep Water, the flyers with their ground shadow), `portraits-x4.png`,
`icons-x4.png` (beside five existing command icons, at 48 and 24 px),
`effects-x3.png` (on five terrains, the dock panel, a Grunt and a Human),
`cities-x3.png` (as authored, with the pennant in the four player colours,
on rock, and beside the other factions' cities), `palette.{png,json}` and
`readability.json` (measured on the masters, with the accent verdict),
`scene-{four,mixed-a,mixed-b}-{desktop,phone}-zoom-{1,0.75}.png` (the scenes
of [`scene.ts`](../../scripts/art/martian-direction/scene.ts) drawn by the
real board host with the default look) and `index.json`. The faction is not
in the engine yet, so a scene gives a Martian seat a **stand-in faction**
that it does not otherwise show and registers the Martian rasters under
that faction's subjects; the Thrall is a second stand-in's Fighter owned by
a shadow player of the seat's colour (drawn with that stand-in's own art
since the Thrall sprite is retired). Its captures start Vite on port 6509
unless `--port` says otherwise, need `CHROME_PATH`, and are written after
the browser closes (a file written under the project while the page is
open makes the dev server reload it).

**The three aliens (bead `pulp_wars-b5f.1`).** The Grunt, the Ray Gunner and
the Shield Projector were redesigned in place (same asset ids, canvases and
anchors; new recipes `*-r5-*` in the same batch, whose `accept` supersedes
the earlier one; see [the faction fragment](factions/MARTIAN.md#the-three-aliens-bead-pulp_wars-b5f1)).
The review now also writes `aliens-before-after-{x4,1x}.png`,
`aliens-before-after-zoom-0.75.png`, `aliens-silhouettes-x4.png`,
`aliens-portraits-x4.png`, `aliens.json` (outline overlap of each pair,
before and after) and `scene-aliens-{desktop,phone}-zoom-{1,0.75}.png` (the
`ALIENS` scene: the new trio and the other Martian units in the live look,
with the "before" trio under a second stand-in seat). The "before" sprites
are re-derived from the superseded recipes' recorded candidates through the
accent step, so no copy of the old masters is kept. What worked: sibling
sprites drift apart only through edits that change the **outline** (a crest
in place of the antenna, a pack, a shield disc wider than the body, a
smaller slimmer body); fresh creations from new subject lines drew other
aliens once more. "Make him smaller, slimmer …" shrank a 54 px figure to
48 px but gave it long thin limbs, which a second edit ("short stubby arms
and legs") fixed.

**Playtest round 6 (bead `pulp_wars-2o7.3`).** The Mothership and the
Tripod were redrawn in place with recipes `*-r6-*`
([MARTIAN.md](factions/MARTIAN.md#the-mothership-and-the-tripod-bead-pulp_wars-2o73)).
A leg could not be removed from the four-legged walker in five edits over
two beads; erasing two legs and **adding one** ("Add only one thing: a
third leg … exactly in the middle between them") gave three first time.
`MARTIAN_FLYER_PRESENTATION_V7` holds the new hull bottom of the
Mothership, and `npm run art:unit-shadows-measure` was run. The same bead
redrew the Human Fighter and Guard in `direction-human`
([ORIGINAL.md](factions/ORIGINAL.md#fighter-and-guard-bead-pulp_wars-2o73)).

## The Ice Folk batch (bead `pulp_wars-7g3.5`)

Batch `direction-ice-folk` holds the direction study and the production art
of a sixth faction, the [Ice Folk](factions/ICE_FOLK.md): faction
`ICE_FOLK`, `fixedFactionColours`, 34 assets (eight units, eight portraits,
ten icons, five effects, City 1 to 3) from 72 recipes, all new PixelLab
calls. Like the Martian batch it starts from fresh creations and **nothing
registers it yet**: its registry lines are in
[`chibi-direction-ice-folk-art-manifest.ts`](../../src/assets/chibi-direction-ice-folk-art-manifest.ts),
which no game module imports until bead `pulp_wars-7g3.6`. It added these
pipeline pieces:

- **`ice-folk-blue` accent preset**
  ([`accent.ts`](../../scripts/art/chibi/accent.ts)): the band hue 175 to
  218, saturation at least 0.2, value at least 0.62; target hue 205 with
  three tenths of the hue spread, and a new optional **saturation step**
  (`saturation: { scale, add, max }`, here 1.4, 0.3 and 0.95), because
  PixelLab draws "ice blue" as a pale glacier cyan (saturation about 0.3)
  that measures 10 from Shallow Water. The step is the Ice Folk preset's
  alone; `undead-violet` and `martian-magenta` are unchanged (tests hold
  both), and the Martian test's list of preset names now includes this one.
- **Subjects**: `UNIT:ICE_FOLK:<ROLE>`, `PORTRAIT:ICE_FOLK:<ROLE>`,
  `CITY:ICE_FOLK:<level>`, the command and ability icons
  `ICON:ACTION:{THROW_BOLAS,COLD_SNAP,SHATTER,SWEEP,ROCKFALL,PROWL}`, the
  technology icons `ICON:TECH:ICE_FOLK:{FORTIFICATION,EXPLOSIVES}` (Deep
  Winter and Brittle), the status icons `ICON:STATUS:{CHILLED,FROZEN}` and
  the effects `EFFECT:{SHATTER,SHATTER_SHARDS,COLD_SNAP,BOLAS,FROST_HIT}`
  (the type `IceFolkArtSubjectV7` in
  [`chibi-art-v7.ts`](../../src/assets/chibi-art-v7.ts), and the manifest's
  subject pattern).
- **Effects** are `palette-map` assets on
  `scripts/art/chibi/palettes/ice-folk-frost.png`, written by
  `npx tsx scripts/art/ice-folk-direction/frost-palette.ts` (a test checks
  the bytes).
- **The study is in the batch.** The first recipes (`yeti-a`,
  `yeti-fur-b`, `yeti-fur-c`, `yeti-ice-b`, `ice-witch-a`, `mammoth-a`) are
  the fur and accent options of the direction study, kept as rejected
  history with their reasons; `npx tsx scripts/art/ice-folk-direction/study.ts`
  measures them again.

What worked, added to the prompt notes of the earlier batches:

- **Measure the colour space before the first call.** The root's starting
  accent (`#8fe3ff`) and a blue-grey fur shade were measured against the
  terrain and the other factions with no PixelLab call: the accent was 12
  from Shallow Water and the shade 6 from the Mountain rock. The study then
  confirmed both on drawn sprites.
- **A cool shade on a pale coat falls into a blue accent's band:** the
  accent step turned the blue-grey fur shade blue. A warm taupe shade
  ("shaded with warm taupe grey, never blue-grey") keeps the fur out of it.
- **Skin colours named by the faction layer reach every figure:** the first
  fragment's "dark slate blue-grey skin" gave the Ice Witch a slate face.
  The fragment now names slate only for "the bare faces, hands and feet of
  beasts", and people's skin is in their subject lines.
- **"Ice blue" by hex in an edit is not controllable** (`#1f9bff` asked,
  `#0813af` drawn); the accent step pins it instead.
- **Portraits of beasts come out as whole small figures.** "Zoom in to a
  close-up portrait: redraw it as only the head and the top of the
  shoulders, twice as big" as an edit of the creation worked for the Yeti,
  the Witch and the Snow Hunter; a sibling edit of the accepted Yeti
  portrait gave the Boulder Yeti's.
- **Icons with the faction layer may gain a figure:** both Bolas creations
  drew a yeti swinging it; "Erase the yeti completely" fixed it.
- **Saturated tan and red skin can fall into the owner key band** (hue 340
  to 5): the Snow Hunter's first face and a dark red fringe did; a colour
  edit with a hex skin tone fixed both. A test checks every master.
- **PixelLab draws mammoth wool orange** in portraits; a recolour edit with
  hex values gave the map sprite's cream.

`npm run art:chibi-ice-folk-direction-review` writes
`art/pixellab/reviews/chibi-batch-direction-ice-folk/`: the study sheets,
`roster-{x4,1x}.png` and `roster-zoom-0.75.png` (the units on Grass,
Mountain rock, Snow and snowy rock beside the other five factions' unit of
the role), `terrain-x2.png` (Grass, Forest, Mountain, both waters and the
Snow overlay over Grass, Forest and Mountain), `portraits-x4.png`,
`icons-x4.png`, `effects-x3.png`, `shatter-frames-x3.png`, `cities-x3.png`,
`markers-x3.png` (Frozen and Frosted on six factions, the HP bar's Shatter
window), `snow-tiles-x2.png`, `snow-board-zoom-{1,0.75}.png` (a board mock
with the Snow overlay over a city's territory and a Blizzard over enemy
land), `palette.{png,json}`, `readability.json` and the scenes
`scene-{four,mixed-a,mixed-b}-{desktop,phone}-zoom-{1,0.75}.png` of
[`scene.ts`](../../scripts/art/ice-folk-direction/scene.ts), which register
the Ice Folk (and Martian) rasters under stand-in factions as the Martian
review does. Captures start Vite on port 6513 unless `--port` says
otherwise and need `CHROME_PATH`; `--copy-to DIR` copies the key sheets.

## The naval batches (bead `pulp_wars-w5j.2`)

Batches `naval-human`, `naval-undead`, `naval-goblin`, `naval-dinosaur`,
`naval-martian` and `naval-ice-folk` hold the
[faction-styled naval units](NAVAL_FACTIONS.md): each faction's Patrol Boat,
Battleship and embarked transport (`ship` class, the shared ships' canvases)
and the two warship portraits (`portrait` class), `fixedFactionColours`,
every asset `ownerColour: false`. 30 assets from 48 recipes, all new
PixelLab calls. A batch is one faction, so the six factions are six
batches. The entries are in
[`chibi-naval-faction-art-manifest.ts`](../../src/assets/chibi-naval-faction-art-manifest.ts),
which the direction registry loads since bead `pulp_wars-w5j.3`. They added
no pipeline piece:

- **Every accepted recipe is an `edit-image-pixen` edit** of the accepted
  batch-4 ships (`"source": { "batch": "4", … }`) or batch-5 portraits, or
  of an earlier step of its own chain, so canvas, anchor and waterline are
  the shared ship's.
- **Subjects:** the Humans keep the shared subjects with `subjectKey`
  `<subject>/HERALDIC`; the other factions use `UNIT:<FACTION>:<ROLE>` and
  `PORTRAIT:<FACTION>:<ROLE>` (the manifest's existing subject pattern
  accepts them). These are not members of `ArtSubjectV7` yet; the manifest
  module types them as `NavalFactionArtSubjectV7`.
- **Accents:** the Undead, Martian and Ice Folk assets name the existing
  presets (`undead-violet`, `martian-magenta`, `ice-folk-blue`).

What worked is in [NAVAL_FACTIONS.md](NAVAL_FACTIONS.md#how-it-was-made):
"Turn it into …" keeps the hull; edits never move a sprite; brown leather
drifts orange and dark brown drifts maroon until a hex value and "not
orange", "not red and not maroon" are named; every red part of the source
must be named or it stays key red.

`npm run art:chibi-naval-faction-review` writes
`art/pixellab/reviews/chibi-batch-naval-factions/`: `naval-sheet-{x4,1x}.png`
and `naval-sheet-zoom-0.75.png` (rows: each naval sprite on Shallow and on
Deep Water, and the portraits on the dock panel; columns: today's shared
sprite for a Coral and a Teal player through the runtime recolour, then the
six factions), `readability.json` (each fleet against both waters, and a
palette distance for every pair of factions per role, also under
deuteranopia), `scene-{coast,mixed}-{desktop,phone}-zoom-{1,0.75}.png` (the
scenes of [`scene.ts`](../../scripts/art/naval-factions/scene.ts) drawn by
the real board host in the live look the game draws: since bead
`pulp_wars-w5j.3` the naval art is wired in under its own subjects and
there are no plates and no rings) and `index.json`. The
review finds the masters by asset id, because the manifest module needs
Vite's `import.meta.env`. Its captures start Vite on port 6530 unless
`--port` says otherwise and need `CHROME_PATH`; `--copy-to DIR` copies the
key sheets and captures.

## The naval branch batch (bead `pulp_wars-5ti.6`)

Batch `naval-branch` (faction `ORIGINAL`) holds the shared Submarine and its
portrait (owned: the tower, pennant and fin are the mask), the Seamanship
and Submersibles icons, the Ram, Board and Torpedo icons, the four sea-ice
tiles and the Icebound overlay; each faction's Submarine and portrait are
later assets of its `naval-<faction>` batch. 26 assets from 58 recipes, all
new PixelLab calls. See
[NAVAL_FACTIONS.md](NAVAL_FACTIONS.md#the-naval-branch-art-bead-pulp_wars-5ti6).
What it added:

- **Recipe class `naval-overlay`** (`class-naval-overlay.txt`): a board
  overlay drawn over a ship, a `BUILDING` asset with the flat camera, no
  faction layer and no owner colour. Its one asset, `OVERLAY:ICEBOUND`, is
  80 x 40 with `anchor` (40, 0) and `bottomMargin: 2`: the lower half of
  the ship's cell, seated on its bottom edge. The manifest's subject
  pattern accepts `OVERLAY:ICEBOUND`.
- **Sibling sources.** Each faction Submarine is an edit of that fleet's
  accepted Patrol Boat, another asset of the same batch:
  `"source": { "recipe": "…", "candidate": 0, "sibling": true }`.
- **An edit can place a sprite.** Edits do not move one, but "Replace the
  boat with … lying low at the very bottom of the image, exactly where the
  boat's hull is now … The upper half of the image stays empty" drew the
  shared Submarine on the cog's waterline (the first edit centred it, 14 px
  high; an owned asset cannot name `bottomMargin`).
- **An explicit `anchor`** on the eight Submarine map sprites, (32, 48):
  the pipeline records it and `registry` prints it.
- **Sea-ice palettes.** `sea-ice-shallow.png`, `sea-ice-deep.png`,
  `sea-ice-deep-blue.png` and `sea-ice-deep-sea.png` are written by
  `npx tsx scripts/art/naval-branch/ice-palettes.ts` (a test checks the
  bytes); the accepted tiles use the first and the third, the other two
  are the `colorImage` of rejected recipes. Pixflux paints a sheet in the
  palette's lightest colour when the subject says "pale".
- **Derived, not generated:** the seven submerged Submarines
  (`chibi-naval-<faction>-submarine-submerged.png`) are written by
  `npx tsx scripts/art/naval-branch/submerged.ts` from the accepted masters,
  and `npm run art:validate` re-derives them
  (`submergedSubmarineProblems`), like the forest pieces and the mountain
  ranges. They are in no batch record.

`npm run art:naval-branch-ice-review` writes
`art/pixellab/reviews/naval-branch-ice/` (tiles, tiling, a mock map, the
overlay on 21 hulls, `readability.json`); it composes rasters and starts no
browser. `npm run art:chibi-naval-faction-review` has the Submarine sheet,
measures and scenes.

## The Rift (bead `pulp_wars-9s0.5`)

Batch `rift` holds the six Rift pieces
([terrain contract](classes/terrain-tiles.md#ruleset-7-rift-pulp_wars-9s05),
[rules](../product/RULESET_7_RIFT.md)): one 1 x 3 crack per orientation,
cut into its west/north, middle and east/south 80 x 80 `TERRAIN` pieces.
It added the `rift` recipe class and three pipeline pieces:

- **`groundStrip` edit source.** A rift recipe is an `edit-image-pixen`
  edit whose source is not an earlier candidate but three copies of an
  accepted ground tile (`chibi-grass-1`, found in batch 1), side by side
  (240 x 80) or stacked (80 x 240). The record stores the strip's asset,
  orientation, batch and PNG hash.
- **`guide`.** Unguided edits of the plain grass strip drew side-view cliffs
  and fire pits at the image's bottom edge. A `guide` (seed, half width,
  inset, wander) draws a dark, deterministic crack on the strip first
  (`riftGuideRaster`), and the instruction asks Pixen to restyle "the dark
  shape" in place, from directly above; Pixen keeps its place, length and
  width.
- **`rift-strip` derivation.** The crack is the set of opaque candidate
  pixels whose redmean distance from the ground strip exceeds the asset's
  `riftStrip.threshold` (40), minus specks under `minComponent` (12), with
  enclosed holes filled and grown by `dilate` (1); `margin` (4) pixels at
  the strip's outer boundary are always ground. Crack pixels take the
  candidate's colours and everything else is the accepted ground, exactly,
  so the three pieces join and every outer edge is the ground tile's.
  Each piece asset names its `piece` (0, 1, 2); the middle and end pieces
  name the first piece's recipe (`riftStrip.recipe`) and are accepted from
  it with `accept --asset`. `art:validate` re-derives every piece from the
  recorded candidate and the recorded ground, and checks the crack size.

Sixteen recipes were generated (see the records): six unguided edits
(rejected: cliffs and fire pits), eight guided edits with an ember or a
dark instruction on two guides (the ember ones put the glow at one end of
the crack), and two guided "glow along the centre line" edits (a thin pure
red line that reads as a CORAL border, and only a dash on the vertical).
The accepted pieces are `rift-h-g1-dark` and `rift-v-g1-dark`, candidate 0:
a pure-dark chasm with a brown rim and grey rock walls on guide g1 (seed 11,
half width 9, inset 18, wander 3). Each was reviewed at 1:1 and x4, alone
and in a 5 x 5 Grass scene with a Forest and a Mountain beside it, and on
the board in the default look, the Classic look and LEGACY (desktop and
phone) with a Saucer and a Mothership over the crack.

`npm run review:ruleset7-rift-ui -- http://localhost:6173/` (bead
`pulp_wars-9s0.5`, `scripts/browser-rift-review-v7.ts`, needs the Vite dev
server and `CHROME_PATH`) mounts the Rift UI fixture
(`tests/fixtures/v7-rift-ui.ts`: a horizontal Rift under a Saucer and a
vertical one under a Mothership, Forest and Mountains beside them) and
captures `rift-board-<look>-<size>-zoom-{1,0.75}.png`,
`rift-saucer-reach-<look>-<size>.png` and `rift-tile-dock-<look>-<size>.png`
for the default look, the Classic look and LEGACY on desktop and phone,
with `evidence.json` (the planned pieces and the dock text). The default
look tones terrain toward the Grass mean; a Rift piece keeps pixels darker
than any Grass pixel (luma below 100) out of that toning, so the chasm keeps
its depth while its Grass matches the cells around it.

## The Dwarf batches (bead `pulp_wars-78i.5`)

Batches `direction-dwarf` and `naval-dwarf` hold the direction study and the
production art of a seventh faction, the
[Steampunk Dwarves](factions/DWARF.md): faction `DWARF`,
`fixedFactionColours`, 35 assets (eight units, the two tunnel mounds, eight
portraits, ten icons, four effects, City 1 to 3) and the five naval pieces,
from 89 recipes, all new PixelLab calls. **Nothing registers them yet:**
the entries are in
[`chibi-direction-dwarf-art-manifest.ts`](../../src/assets/chibi-direction-dwarf-art-manifest.ts),
which no game module imports until bead `pulp_wars-78i.6`. They added these
pipeline pieces:

- **`dwarf-copper` accent preset**
  ([`accent.ts`](../../scripts/art/chibi/accent.ts)) and **bands that wrap
  round 0**: a preset whose `hueFrom` exceeds its `hueTo` matches hues from
  `hueFrom` up to 360 and from 0 to `hueTo`, and measures the hue offset
  the short way round its centre. The earlier presets do not wrap and keep
  their derivation byte for byte (their masters re-derive unchanged). The
  Dwarves have no colour accent to pin; the preset moves the deepest
  red-copper shades (hue 340 to 9, saturation at least 0.45, value at least
  0.2) to copper at hue 7 to 14, so no Dwarf master has a pixel in the owner
  key's band. Every Dwarf asset but the effects names it.
- **Subjects**: `UNIT:DWARF:<ROLE>`, `UNIT:DWARF:MOUND` and
  `UNIT:DWARF:MOUND_RIDER`, `PORTRAIT:DWARF:<ROLE>`, `CITY:DWARF:<level>`,
  `ICON:ACTION:{TUNNEL,BOMB_RUN,ASSEMBLE,KNOCKBACK,PLATED}`,
  `ICON:ACTION:DWARF:TEND_WOUNDED` (Repair), `ICON:TECH:DWARF:{FORTIFICATION,EXPLOSIVES}`
  (Dig In, Blasting Charges), `ICON:STATUS:{CLOCKWORK,DUG_IN}` and
  `EFFECT:{ERUPTION,BOMB_BLAST,STEAM_PUFF,REPAIR_SPARKS}` (the type
  `DwarfArtSubjectV7` in [`chibi-art-v7.ts`](../../src/assets/chibi-art-v7.ts),
  and `DWARF` and the two status names in the manifest's subject pattern);
  the naval subjects `UNIT:DWARF:<naval role>` and
  `PORTRAIT:DWARF:<warship>` are the generic naval subjects of bead
  `pulp_wars-w5j.3` (`navalArtSubjectV7`), live once `DWARF` is a faction.
- **Effects** are `palette-map` assets on
  `scripts/art/chibi/palettes/dwarf-forge.png`, written by
  `npx tsx scripts/art/dwarf-direction/forge-palette.ts` (a test checks the
  bytes).
- **The 32 px lineup** of the spec runs before any batch:
  `npx tsx scripts/art/dwarf-direction/lineup.ts --recipes a,b,c,d --tag T`
  (the Hammerer, Gyrocopter, Steam Cannon and Steam Tank recipes) writes
  `lineup-study-T`, and `--masters` measures the accepted masters. Its
  thresholds are calibrated on the 120 same-role pairs of the six accepted
  factions ([`measure.ts`](../../scripts/art/dwarf-direction/measure.ts)).

What worked, added to the prompt notes of the earlier batches:

- **The faction layer reaches every class, icons included**: a fragment
  that names the faction's people ("dwarves") or its small props ("round
  goggles", "white-faced pressure gauges") put a white-bearded dwarf or a
  goggled gadget with a face into every icon creation, whatever the
  negative said. Keep figures and face-like props in the subject lines.
- **A sibling edit of one clean icon makes the rest**: "Redraw it as a
  different object in the same style: …" on the accepted Bomb Run icon
  gave clean Tunnel, Assemble and Repair icons; an edit sends no faction
  layer.
- **"Add only one tiny detail: … on the <part>"** adds a 3 px lamp where
  asked; without the part named it went into a cannon's muzzle.
- **"Like a butterfly" draws a butterfly**: a wind-up key is "a short shaft
  with a flat round handle with two round holes, like a clock key".
- **Erasing a flyer's skids leaves its gap** (the Martian Saucer's legs).
- **Effect creations put sparks on a campfire** twice; a sibling edit of
  the accepted steam puff made them. A ring of earth turned into a black
  tyre once palette-mapped: dark earth and grey rock map onto the
  palette's iron and outline. Prefer code-driven copies of a burst.

`npm run art:chibi-dwarf-direction-review` writes
`art/pixellab/reviews/chibi-batch-direction-dwarf/`: `lineup-{1x,x3}.png`
and `lineup.json` (with the `lineup-study-*` files of the study),
`roster-{x4,1x}.png` and `roster-zoom-0.75.png` (each unit on Grass, Forest,
Mountain and Snow beside the other six factions' unit of its role, and the
mounds), `terrain-x2.png` (also the Rift and both waters, the mounds and
the Dig In earthwork), `portraits-x4.png`, `icons-x4.png`, `effects-x3.png`,
`mound-x3.png` (the mounds and the earthwork on every terrain, Snow and a
city centre), `eruption-frames-x3.png` (the eruption timeline on a board
mock), `cities-x3.png`, `naval-x4.png` (the Dwarf ships beside the six
fleets), `palette.{png,json}`, `readability.json` and the scenes
`scene-{mixed,terrain,coast}-{desktop,phone}-zoom-{1,0.75}.png` of
[`scene.ts`](../../scripts/art/dwarf-direction/scene.ts), drawn by the real
board host in the live look as the game passes it, which has no base plates
since bead `pulp_wars-w5j.3`, the six other fleets from the live registry,
with the Dwarf rasters under Human stand-in subjects and the mounds under a
Dinosaur stand-in. No sheet draws a plate. Captures start Vite on port
6534 unless `--port` says otherwise and need `CHROME_PATH` (and `node` on
the `PATH` for Vite); `--copy-to DIR` copies the key sheets.

## Faction building study (bead `pulp_wars-xdh.1`)

The exploration run `art/explorations/faction-buildings-2026-10/` holds the
recipes of the [faction building looks](FACTION_BUILDINGS.md) sample. It
overrides `class-calm-building`, `class-crop-rows` and
`camera-crop-pattern` so that no Human material or "plant" is named, and its
grass recipes force the palettes written by
`npx tsx scripts/art/faction-buildings/undead-grass.ts`, which also writes
the code-recoloured Undead grass candidates. `npm run
art:faction-buildings-review` writes
`art/pixellab/reviews/faction-buildings-study/`: building and grass sheets,
before and after board scenes from
[`scene.ts`](../../scripts/art/faction-buildings/scene.ts) (drawn per cell
through a 721-variant registry, no game code changed) and a contact sheet.
Its captures start Vite on port 6540 unless `--port` says otherwise and need
`CHROME_PATH`; `--copy-to DIR` copies the key outputs.

## The curiosities batch (bead `pulp_wars-737.5`)

Batch `curiosities` holds the art of the
[map curiosities](../product/RULESET_7_MAP_CURIOSITIES.md#122-art-pixellab-chibi-direction):
the neutral Giant Spider and its portrait, the lair web, the Fountain of
Youth, the Shrine and the Sunken Wreck as 80 x 80 tile overlays, five
legend icons, three effect sprites and the provoked marker; 15 assets from
39 recipes, all new PixelLab calls. The class contract, the accepted
recipes, the prompt notes and the measurements are in
[classes/curiosities.md](classes/curiosities.md). **Nothing registers it
yet:** its registry lines are in
[`chibi-curiosities-art-manifest.ts`](../../src/assets/chibi-curiosities-art-manifest.ts),
which no game module imports until bead `pulp_wars-737.6`. It added these
pipeline pieces:

- **Four recipe classes without a faction layer:** `curiosity-monster`
  (the unit sizes and options), `curiosity-portrait`, `curiosity-site` (a
  `BUILDING` asset of exactly one cell) and `curiosity-item` (`ICON`,
  `EFFECT` and `STATUS` assets with the icon camera), all `as-is`. The
  batch's faction is `ORIGINAL`, as for the other neutral batches, and is
  never sent. It sets `fixedFactionColours`, so the Spider and its portrait
  are `ownerColour: false` and register with `fixedColours: true`.
- **Subjects** (texts in `SHARED.json`): `UNIT:MONSTER_GIANT_SPIDER`,
  `PORTRAIT:MONSTER_GIANT_SPIDER`, `CURIOSITY:{WEB,FOUNTAIN,SHRINE,WRECK}`,
  `ICON:CURIOSITY:{WEB,FOUNTAIN,SHRINE,WRECK,BOUNTY}`,
  `EFFECT:{FOUNTAIN_HEAL,SHRINE_BLESSING,SALVAGE_COINS}` and
  `STATUS:PROVOKED` (the type `CuriosityArtSubjectV7` in
  [`chibi-art-v7.ts`](../../src/assets/chibi-art-v7.ts), and the
  manifest's subject pattern).

`npm run art:curiosities-review` writes
`art/pixellab/reviews/chibi-batch-curiosities/` (see
[the class document, section 5](classes/curiosities.md#5-review-and-measurements)).
It composes its sheets from the masters with no browser capture, and with
`--preview recipe[:candidate],… --out DIR` lays raw candidates out the same
way before acceptance.
[`scene.ts`](../../scripts/art/faction-buildings/scene.ts) and a contact
sheet. Its captures start Vite on port 6540 unless `--port` says otherwise
and need `CHROME_PATH`; `--copy-to DIR` copies the outputs.

### The faction building batches (bead `pulp_wars-xdh.2`)

Batches `buildings-undead`, `buildings-martian`, `buildings-dinosaur`,
`buildings-ice-folk` and `buildings-dwarf` hold the nine production
masters, one batch per faction. They added one pipeline piece and one
side script:

- **Faction improvement subjects.** A batch asset may have the subject
  `IMPROVEMENT:<FACTION>:<ID>` (`IMPROVEMENT:UNDEAD:FARM`); its subject
  line is that key in `scripts/art/chibi/subjects/<FACTION>.json`. The
  assets are `calm-building` (seated) and `crop-rows` masters with
  `ownerColour: false`, like the shared set.
- **Imported chains.** Every accepted chain of the exploration run was
  imported (`import --batch buildings-<faction> --from
art/explorations/faction-buildings-2026-10 --ids …`); a chain's first
  recipe may be a cross-batch edit of `direction-human` (`windmill-flat-a`,
  `veg-flux-a`). Sources that are not the master (`solar-b`,
  `mushroom-flux-b`, `bone-mill-edit-a`) are recorded as rejected with the
  reason. The Bone Mill's `bone-mill-edit-c` and `bone-mill-edit-d` were
  generated in the production batch.
- **The Undead ground is not a batch.** It is derived in code from the
  accepted Grass masters (a colour swap and a few motifs since bead
  `pulp_wars-2yc.14`, a colour swap alone before), so it has no recipe:
  [`gloam-grass.ts`](../../scripts/art/faction-buildings/gloam-grass.ts)
  bakes `chibi-undead-grass-1..3` and `chibi-undead-forest-1..2` into
  `public/assets/chibi/terrain/` and records the swap and every hash in
  `gloam-grass.json`. `art:validate` calls `gloamGrassProblems`: the
  masters must be what the Grass masters and Forest bodies derive today.
  After a change to those, run the bake again and review the diff.
- The review is `npm run art:faction-buildings-review`: its sheets read
  the production records, its "after" scenes are the game's own drawing,
  and it captures a captured city and the Gallery's Buildings tab.

### Whole Farms and the Sawmill redo (bead `pulp_wars-2o7.2`)

The user's playtest note: a Farm "cut off at the top and bottom looks
weird"; one Farm should look good rather than connect to the next. No Farm
look is a seamless pattern any more
([what each faction shows](FACTION_BUILDINGS.md#9-whole-farms-and-the-redo-bead-pulp_wars-2o72)).
Two pipeline pieces:

- **A whole plot.** A `crop-rows` asset that names a `bottomMargin` and no
  `cropRows` is not stamped: the candidate's own beds, ends and all, are
  seated like a calm building (centred, `bottomMargin` px above the tile's
  bottom edge), and the record's derivation is `seated`. The shared Farm
  (`veg-flux-a`, margin 4), the Hydroponic Farm (`hydroponic-edit-a`, 3)
  and the Frost Garden (`frost-garden-edit-a`, 6) were accepted again from
  their recorded candidates this way, with no PixelLab call. A crop-rows
  asset has stamps or a margin, never both. The stamped derivation
  (`cropRowsRaster`) stays for a later pattern; no production asset uses it.
- **The `calm-plot` class**: a small yard on its own patch of earth, in the
  calm style, seated, no faction layer (`class-calm-plot.txt`; the
  `calm-building` text forbids ground and asks for one building). The
  Graveyard and the Mushroom Farm moved to it from `crop-rows`; their old
  row recipes stay in the batches as history, which is the only reason the
  class lists Pixflux.

What PixelLab did, for the next yard:

- Pixen draws a yard as an isometric block of earth. "Make the plot a flat
  thin patch with no thick side walls" in an edit thinned the Graveyard's
  slab; on the Mushroom Farm the same wording turned the square block into
  a round bed that is still thick.
- An edit that recolours "the gravestones and the crypt walls" with hex
  values recoloured the ground too (`graveyard-plot-b-edit`); naming only
  the stones worked (`graveyard-plot-c-edit`).
- "About three quarters of the image wide" gives 48 to 62 px of an 80 px
  request. A request of 96 px drew the best Graveyard at 86 px, which does
  not fit the tile; 84 px is not a size Pixen handles (a dithered
  background). Edits of an 80 px creation are the way.
- One edit that names one part and its colour by hex ("the dull grey saw
  blade becomes ... light silver-grey steel (#c9ced6) with sharp pointed
  teeth") gave the Sawmill its blade and changed nothing else.

`npm run art:faction-buildings-review` also writes `farms-sawmills-x3.png`
and `farms-sawmills-1x.png`: every Farm and Sawmill look on Grass, on Snow
and on its faction's territory ground.

### Free-standing markers (bead `pulp_wars-2yc.14`)

The Undead Graveyard as tombstones on the tile's own ground
([what and why](FACTION_BUILDINGS.md#10-the-graveyard-without-a-plate-and-the-ashen-ground-bead-pulp_wars-2yc14)).
Three pipeline pieces:

- **The light layer.** A class recipe with `light: true` puts
  `light-south-west.txt` after the camera layer (layer name `light`). Only
  `calm-markers` has it; every other class builds the prompt it built.
- **`generate-image-v2`** is a fourth endpoint: no options, sides that are
  multiples of 4, several candidates per call (16 at 80 x 80), and a
  description of at most 2000 characters (the manifest check refuses a
  longer one, as PixelLab does). It is not deterministic.
- **The `calm-markers` class**: the chibi style layer (not the calm one),
  the light layer, a class text that asks for a few upright things with
  nothing under or between them, seated, no faction layer. Pixen and
  Pixflux are listed only for the rejected samples and the retired rows.

### Free-standing features (bead `pulp_wars-2yc.15`)

The seven achievement Monuments (batch `monuments`), the Frost Garden's
snow-walled plot and the soil patch of Fertile Ground
([what and why](FACTION_BUILDINGS.md#11-achievement-monuments-a-richer-graveyard-the-frost-garden-plot-and-the-soil-of-fertile-ground-bead-pulp_wars-2yc15)).

- **The `calm-feature` class** is `calm-markers` for any subject: the same
  layers (chibi style, camera, light, class, subject), `generate-image-v2`,
  seated, no faction layer. Its class text names no subject and says
  "nothing is drawn under or around it except what the subject names", so a
  subject may carry a snow wall or be a patch of earth. It makes a BUILDING
  or a RESOURCE; a RESOURCE is seated in its 48 x 48 canvas by the asset's
  `bottomMargin` (Fertile Ground: 5, which centres its 38 px). Pixen is
  listed only for the wheat recipe Fertile Ground keeps as history.
- **Monument subjects** are `IMPROVEMENT:MONUMENT:<ACHIEVEMENT>`, with
  their texts in `SHARED.json`.
- **What `generate-image-v2` did.** A request of 48 x 72 or 48 x 48 gives
  16 candidates like one of 80 x 80. It fills the request: with no word
  about a margin most Graveyard and Slayer candidates touch or cross an
  edge; "the group is small, with a wide empty margin all round" in the
  subject gave 61 x 61 in 80 x 80. One description is at most 2000
  characters with every layer, so a subject of this class has about 450.
- **A subject text is live for its asset's old recipes too**: the manifest
  check measures the description of every `generate-image-v2` recipe of the
  asset with today's `subjectKey`, so a longer subject fails the check for
  the recipes already generated. The records keep the text that was sent.
- **Red on an unowned piece** is caught by the owner-key check of the
  tests (the Frost Garden's holly berries); pick another candidate.

## The Candy batches (bead `pulp_wars-jdb.5`)

Batches `direction-candy` and `naval-candy` hold the direction and the
production art of an eighth faction, the [Candy](factions/CANDY.md):
faction `CANDY`, `fixedFactionColours`, 39 assets (eight units, eight
portraits, City 1 to 3, the Crumbs marker, twelve icons, seven effects) and
the five naval pieces, from 75 recipes, all new PixelLab calls. **Nothing
registers them yet:** the entries are in
[`chibi-direction-candy-art-manifest.ts`](../../src/assets/chibi-direction-candy-art-manifest.ts),
which no game module imports until bead `pulp_wars-jdb.6`. They added these
pipeline pieces:

- **`candy-pink` accent preset** and a **value step**
  ([`accent.ts`](../../scripts/art/chibi/accent.ts)): a preset may carry
  `value: { scale, add }`, and every accent pixel's value becomes
  `min(1, value * scale + add)`, after the saturation step. The earlier
  presets have no value step and keep their derivation byte for byte.
  PixelLab draws "cotton-candy pink, colour #ffb8d8" as a saturated
  raspberry shaded with wine red (34% to 53% of a sample's pixels in the
  Martian magenta's band); the preset finds every pink and wine tone (hue
  310 to 356, saturation and value at least 0.3), moves its hue to 329 to
  338, caps its saturation at 0.5 (scale 0.55, add 0.08) and lifts its
  value (scale 0.6, add 0.42), so a wine shade becomes a rose and the tones
  keep their order. Every Candy asset but the effects names it.
- **Subjects**: `UNIT:CANDY:<ROLE>`, `PORTRAIT:CANDY:<ROLE>`,
  `CITY:CANDY:<level>`, `CRUMBS` (a `RESOURCE`-class marker like `GRAVE`),
  `ICON:ACTION:{SUGAR_RUSH,REBAKE,SUGAR_TOSS,SPLAT,BOUNCE}`,
  `ICON:ACTION:CANDY:TEND_WOUNDED` (Frosting),
  `ICON:TECH:CANDY:{FORTIFICATION,EXPLOSIVES}` (Home Sweet Home, Peppermint
  Surprise), `ICON:STATUS:{RUSHED,CRASHED,SPLATTED}`,
  `ICON:HUD:CANDY:EMBLEM` and
  `EFFECT:{GUMBALL_SHOT,PIE,SPLAT,SUGAR_TOSS,REBAKE_PUFF,PEPPERMINT_POP,BOUNCE}`
  (the type `CandyArtSubjectV7` in
  [`chibi-art-v7.ts`](../../src/assets/chibi-art-v7.ts), and `CANDY`,
  `CRUMBS` and the three status names in the manifest's subject pattern);
  the naval subjects are the generic naval ones, live once `CANDY` is a
  faction.
- **Effects** are `palette-map` assets on
  `scripts/art/chibi/palettes/candy-sugar.png`, written by
  `npx tsx scripts/art/candy-direction/sugar-palette.ts` (a test checks the
  bytes).

What worked, added to the prompt notes of the earlier batches:

- **Measure the first samples before iterating on shape.** The pink was
  wrong on every sample in the same way, so one accent preset fixed the
  whole faction and no colour edit was needed.
- **A word names its strongest picture**: "bear" drew a plush teddy bear
  with a cream belly through seven recipes, whatever the materials and the
  negative said; a subject line without the word ("a chubby jelly figure
  moulded in one piece like a jelly baby, with two small round ears") drew
  the gummy sweet. "Balloon whisk" drew a balloon.
- **A dome cannot be made taller by an edit**: "redraw it bigger and
  taller" turned a squat gumdrop into a pill.
- **A faction of faces puts a face on a machine**; "erase the white face …
  so it is plain pink frosting" removed it.
- **Check an effect after the palette map, not before**: red maps to
  caramel and pale teal to mint. A colour edit that names the palette's hex
  values fixed both.
- **The `resource` class draws a single calm object** even for a heap; the
  subject line that named "three broken pieces … with many small loose
  crumbs" gave the Crumbs.

**The sweet-shop redesign (bead `pulp_wars-2o7.3`).** The basic line
unit, the Gumball Gunner, the Gummy Bear and the Rock Candy Golem were
redrawn in place, with their portraits and the Confectioner's
([CANDY.md](factions/CANDY.md#redesign-october-2026-the-sweet-shop)). The
fresh creations (three concepts of the line unit, the gumball machine and
two portraits) were generated in the exploration run
`art/explorations/candy-redesign-2026-10` with the new faction fragment,
which is now the live one in CANDY.md, and six recipes were imported
(`import --batch direction-candy --from
art/explorations/candy-redesign-2026-10`); the recolours are edits made in
the batch. The assets name new subject keys (`UNIT:CANDY:FIGHTER/TOFFEE`,
`UNIT:CANDY:MARKSMAN/MACHINE`, `UNIT:CANDY:KNIGHT/AMBER`,
`UNIT:CANDY:JUGGERNAUT/MINT`, their portraits and
`PORTRAIT:CANDY:CAPTAIN/APRON`), and the Gunner uses the `machine` class.
Every asset still goes through `candy-pink`; the test that asked for pink
on every unit now asks for the opposite on the four redrawn ones and for
under a quarter of the roster. The lineup now misses four of seven pairs
by the measure (the toffee unit against the Goblin and the Yeti).

**The Chocolatier look (bead `pulp_wars-jdb.10`).** The user chose it from
the proposal in `art/explorations/candy-look-2026-10/` and the faction was
converted in place
([CANDY.md](factions/CANDY.md#the-chocolatier-look-october-2026)): six
proposal samples were imported and the other pieces are recolour edits of
the accepted sprites in `direction-candy` and `naval-candy`; the Gummy Bear
and the Rock Candy Golem were replaced by the Chocolate Bunny and the
Gingerbread Giant, fresh creations imported from the options run under the
old asset ids. Two things are
new to the pipeline's use, neither a new piece:

- **A palette swap in place.** The seven Candy effects name
  `candy-sugar.png` as `paletteFrom` and `candy-chocolate.png` (the
  Peppermint pop `candy-mint-chocolate.png`) as `palette`, and their own
  first recipe was accepted again: the candidate is mapped to the sugar
  palette as before and swapped colour for colour, with no PixelLab call.
  `npx tsx scripts/art/candy-direction/sugar-palette.ts` writes the three
  palettes (a test checks the bytes).
- **An imported edit whose source is in the same batch.** The proposal's
  edits name their source as `{ "batch": "direction-candy", … }`; the
  production recipe names the same recipe without the batch, which `import`
  accepts and `art:validate` verifies. An exploration recipe whose id is
  already taken in the production batch (`marshmallow-a`) cannot be
  imported; that piece was edited again in the batch.

`npm run art:chibi-candy-direction-review` writes
`art/pixellab/reviews/chibi-batch-direction-candy/`: `lineup-{1x,x3}.png`
and `lineup.json` (the spec's 32 px lineup with the Dwarf lineup's measures
and calibrated thresholds), `roster-{x4,1x}.png` and `roster-zoom-0.75.png`
(each unit on Grass, Forest, Mountain and Snow beside the other seven
factions' unit of its role), `terrain-x2.png`, `portraits-x4.png`,
`icons-x4.png`, `effects-x3.png`, `markers-x3.png` (the Crumbs on every
ground and Snow, and the Crashed, Rushed and Splatted markers on units at
the sizes of `CANDY_MARKERS_V7`), `cities-x3.png`, `naval-x4.png` (the
Candy ships beside the seven fleets), `palette.{png,json}`,
`readability.json` and the scenes
`scene-{mixed,terrain,coast}-{desktop,phone}-zoom-{1,0.75}.png` of
[`scene.ts`](../../scripts/art/candy-direction/scene.ts), drawn by the real
board host in the live look with the Candy rasters under Human stand-in
subjects (the ships under the shared ship subjects the Human fleet takes)
and the stand-in seat's faction colour set to the Candy pink in the page.
Captures start Vite on port 6541 unless `--port` says otherwise and need
`CHROME_PATH` (and `node` on the `PATH` for Vite); `--copy-to DIR` copies
the key sheets.

## The ninth units (bead `pulp_wars-2yc.34`)

The seven land units ruleset `7r55` added (Ogre, Wight, Stegosaurus, Shock
Trooper, Musk Ox, Whirligig, Jawbreaker) each got a sprite and a portrait
as two new assets of their faction's direction batch, subjects
`UNIT:<FACTION>:SWORDSMAN` and `PORTRAIT:<FACTION>:SWORDSMAN`: 14 assets
from 37 recipes, all new PixelLab calls (seeds 234101 to 234754), and no
pipeline piece. The recipes of a unit follow the recipe its faction's
batch was made with:

- **A sibling edit where the faction has a figure to keep** (the Wight from
  the Skeleton, the Shock Trooper from the Grunt, and their busts and the
  Ogre's from the sibling's bust): `"source": { …, "sibling": true }`.
- **A fresh creation where it has none** (the Ogre, the Jawbreaker, the
  Whirligig with the `machine` class, the Stegosaurus and the Musk Ox with
  `"options": { "view": "side", "direction": "east" }`), then edits of it.
  `direction-dinosaur` had only edits before; its fragment was first sent
  for the Stegosaurus.
- **Machines and whole animals as portraits** use the `icon` class (the
  Whirligig, the Stegosaurus), like the Steam Tank's and the Ankylosaurus's.

What PixelLab did, added to the prompt notes of the earlier batches:

- **Chibi proportions need their sentence.** A subject line without "a huge
  round head about half of the figure's height" drew a small-headed,
  realistic soldier at 72 x 88 (`ogre-a`, `-b`).
- **A light sentence that names no sun is safe.** "He is lit from the left:
  the left side … is the lightest" in an addendum drew no sun (the
  Swordsman's "Sun at the bottom left" did).
- **`edit-image-pixen` returns two candidates that are the same image**, in
  every edit of this bead; candidate 0 is accepted.
- **An erase can shift a colour elsewhere:** erasing the Stegosaurus's neck
  marks paled its fins; a recolour with hex values for the fin and its
  shadow side restored them without red.
- **Count by position:** "exactly three hammers" drew four in three
  creations of four; an edit that names where each hammer is ("top left,
  top right and front centre") gave three.
- **Of six concurrent `generate` runs, five failed with "fetch failed"**
  before any job was submitted (nothing was recorded, so the same recipe
  ids were run again, two or three runs at a time, which worked).

The generic `npm run art:chibi-batch-review -- --batch direction-<faction>
--skip-capture` works on these fixed-colour batches (sheets and mocks of
every asset of the batch), but it writes `index.json` into the folder of
the faction's own direction review and overwrites that review's index: its
output for this bead was read and not checked in. The faction direction
reviews (`art:chibi-<faction>-direction-review`) compare each unit with a
classic sprite or with the same role of other factions and do not list
the ninth units yet.
