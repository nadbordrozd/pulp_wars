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

| Recipe class      | Endpoint                                                                    | Master                                                                                                 |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `unit`            | `create-image-pixen`, south-east, low detail                                | the candidate, generated at the master size                                                            |
| `ship`            | as `unit`, then optional edit                                               | as `unit`; a boat class text (no water, waves or plate under the hull) for ships and the embarked form |
| `settlement`      | Pixen, then optional `edit-image-pixen`                                     | the candidate; the edit removes a plate ("Remove all ground …")                                        |
| `building`        | Pixen, then optional edit                                                   | as settlement                                                                                          |
| `crop-field`      | Pixen, then optional edit, no faction layer                                 | as settlement: an unowned field of crops registered as a building (the Farm, bead `pulp_wars-6gd.5`)   |
| `resource`        | Pixen, then optional edit                                                   | as settlement                                                                                          |
| `terrain`         | `create-image-pixflux` (flat shading) or Pixen                              | a field at least 2x the tile; the seamless 80 x 80 window is cropped, optionally inside a `cropRegion` |
| `tall-terrain`    | Pixen, then optional edit                                                   | the transparent body drawn over an accepted ground tile's bottom cell                                  |
| `portrait`        | Pixen, `side` view, south-east, low detail                                  | the candidate: a 48 x 48 head-and-shoulders interface portrait with an owner mask (batch 5)            |
| `icon`            | Pixen, low top-down, no direction                                           | the candidate: a 48 x 48 (HUD 32 x 32) interface item sprite; also whole ships, the Catapult, the Egg  |
| `status`          | Pixen, flat camera, side view                                               | the candidate palette-mapped: a 32 x 32 board status marker                                            |
| `effect`          | Pixen, icon camera, side view                                               | the candidate palette-mapped: an ability effect sprite up to 48 x 48                                   |
| `calm-building`   | Pixen (selective outline), then optional edit; calm style, no faction layer | **seated**: the calm improvement set of the new direction                                              |
| `calm-settlement` | as `calm-building`                                                          | **seated**: cities and the Village in the calm style                                                   |
| `crop-rows`       | Pixen or Pixflux, crops on strips of soil, then edits; no faction layer     | **crop-rows**: the Farm as a seamless pattern of crop rows                                             |

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

### Runtime ground fringe

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
start Vite on port 6301 unless `--port` says otherwise.

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
against a Human, an Undead and a Goblin seat, launched through the
controller because the setup form offers the faction only from bead
`pulp_wars-c87.4`), `ingame-roster-{desktop,phone}-zoom-{1,0.75}.png` (the
scene of
[`review-dinosaur-scene-v7.ts`](../../scripts/art/chibi/review-dinosaur-scene-v7.ts)
drawn by the real board host: the eight units and the Egg in the four
player colours, on base plates and with the damaged HP bar, beside the other
three factions) and `dinosaur-index.json`. Its captures start Vite on port 6431
unless `--port` says otherwise. It does not run the batch review.

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
