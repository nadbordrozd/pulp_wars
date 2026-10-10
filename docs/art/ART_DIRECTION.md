# Art Direction

This is the canonical shared art direction for Pulp Wars: the **Bold chibi**
direction the user approved on 2026-09-29 for all Ruleset 7 art, with the
owner-colour rule of 2026-10-02. All of its art is approved (user,
2026-10-10) and it is the only art a player of the current game sees: the
earlier art set and its `?art=legacy` switch were retired in bead
`pulp_wars-67q.13` (see the [migration plan](CHIBI_MIGRATION_PLAN.md)).
This file absorbed the former `CHIBI_ART_DIRECTION.md`; its section numbers
are unchanged.

Technical class contracts live under [`docs/art/classes/`](classes/) and
may specialize, but never contradict, this direction. The direction of the
frozen Ruleset 6 art, which this file described before, is kept at the end
under [Frozen Ruleset 6 art](#frozen-ruleset-6-art); it governs no new
asset.

The decision rests on two studies:

- the [style exploration](STYLE_EXPLORATION_2026-09.md), which compared six
  PixelLab styles;
- the [tile-80 style test](TILE80_STYLE_TEST_2026-09.md), where the user chose
  Bold chibi for units and preferred the flat-shaded grass.

The problems the style had to fix come from the
[sprite review](reviews/SPRITE_REVIEW_2026-09.md).

## 1. The style in one paragraph

Bold chibi pixel art: chunky, cute figures with big heads, short sturdy
bodies and oversized weapons or tools. Thick single-colour black outlines,
low detail and flat, simple shading. Every figure reads from its silhouette
alone. Units and buildings are saturated and carry a large owner-colour area;
terrain is calmer, so the pieces pop off the board. The mood is playful and
slightly ridiculous, a board game come to life, and it must stretch to wildly
different factions (see [factions](factions/README.md)).

## 2. Shared rules for every asset

- **Camera:** three-quarter view looking slightly down, subject facing down
  and to the right (south-east). PixelLab's `create-image-pixen` endpoint
  honours this; general text-to-image does not.
- **Outline:** single-colour black outline, the same weight at every size.
  Don't mix outlined and lineless assets on the map.
- **Nothing under it:** units, cities, buildings, resources and improvements
  stand directly on the terrain. No pedestal, base, disc, rim, ground plate,
  soil patch or stone slab. The prompt says "nothing is drawn under it", the
  negative prompt lists plate words, and review rejects any output that
  still has one.
- **Transparent background** for everything except terrain tiles.
- **Legibility first:** judge every asset at its real size at zoom 0.75 and 1
  before judging it enlarged. If a detail disappears at zoom 1, leave it out.
- **One era per faction:** don't mix eras within a faction. For example, no
  Napoleonic officer beside medieval knights. The faction fragment names the
  era.
- **Size hierarchy:** units > resources. Giants and siege are clearly bigger
  than standard units; a city clearly outranks a village; resources and
  small improvements never rival a unit in size or saturation.

### Light

**The sun is in the south-west, at the bottom left of the screen** (user,
2026-10-05, stated twice: "the sun is in the south west - bottom left").
Faces turned to the left or toward the viewer are lit; faces turned to the
right are in shadow; snow and highlights are brightest on their left side;
a cast shadow falls up and to the right, behind the thing, and is short.
This replaces the "upper-left" wording the legacy direction and the
square-grid contract carried before; both put the light on the left.

- New art states the rule in its prompt (the fragment
  `scripts/art/chibi/fragments/light-south-west.txt`) and is never mirrored:
  a mirrored sprite is lit from the other side.
- `scripts/art/lighting-qa.ts` measures a sprite (left half minus right half
  of every run of paint between outlines, in luma points; +1.5 or more is
  lit from the left, -1.5 or less from the right). It reads one-material
  forms well (mountains, rocks). On a unit, a building or a city it mostly
  reads local colour, so there it lists sprites to look at and is not a
  verdict.

**Conforming** (measured, bead `pulp_wars-2yc.1`): the mountains (every
piece of the massif set, checked in the bake), and the faction forest
clumps (bead `pulp_wars-2yc.2`, none lit from the right).

**Known deviations, not fixed yet.** The measure flags these sprites of
`public/assets/chibi/` as lit from the right; each needs a look before it is
called wrong:

| Class         | Sprites | Flagged | Note                                                                                                                                            |
| ------------- | ------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `settlements` | 38      | 11      | Mostly lit from the left (mean +8.2). By eye the Dwarf city 2 is lit from the right.                                                            |
| `buildings`   | 34      | 18      | Mixed, and the measure is confounded by roof and wall colours. The Forge and the Market read as lit from the left by eye.                       |
| `resources`   | 14      | 7       | Small sprites; mixed.                                                                                                                           |
| `forest`      | 24      | 7       | The default Forest set stamps its clumps mirrored as well as plain; each tree's highlight is at its top left, so no side is strong (mean +0.8). |
| `units`       | 143     | 84      | Not a verdict: units face right, and their pale faces and shields sit on their right half.                                                      |

## 3. Geometry and resolution

All sizes are CSS pixels at zoom 1, which is the normal play view.

| Class                           | Canvas (DPR 1 master)    | Placement and overflow                                                                                                |
| ------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Tile                            | 80 x 80                  | Base grid cell                                                                                                        |
| Terrain tile                    | 80 x 80, opaque          | Fills the cell; tiles seamlessly; 2–3 variants per terrain                                                            |
| Tall terrain (Forest, Mountain) | up to 80 x 104           | Bottom-aligned to the cell; overflows upward only                                                                     |
| Standard unit                   | 56 x 80                  | Bottom-centred; figure about 60–70% of the tile width and 90–110% of its height; the head may overlap the tile behind |
| Large unit (Knight, siege)      | up to 72 x 88            | Bottom-centred; at most 4 px side overflow                                                                            |
| Giant (Juggernaut)              | up to 88 x 104           | Bottom-centred; side overflow up to 4 px, upward overflow allowed                                                     |
| City, village                   | up to 96 x 104           | Bottom-centred; side overflow up to 8 px each side, upward overflow up to 24 px; fills the tile                       |
| Building or improvement         | up to 80 x 88            | Bottom-centred; upward overflow up to 8 px                                                                            |
| Resource                        | about 40 x 40 to 48 x 48 | Centred; visibly smaller and calmer than a unit                                                                       |
| Interface portrait              | 48 x 48                  | Interface only (DOM); owned, with a mask; head and shoulders (ships and the Catapult whole)                           |
| Interface icon                  | 48 x 48 (HUD 32 x 32)    | Interface only (DOM); unowned; one item floating on transparency, no badge or frame                                   |
| Status marker (Plague, Bitten)  | 32 x 32                  | Board overlay; unowned; drawn at 16 CSS px on a dark token in the unit's marker slot (bead `pulp_wars-vkq.14`)        |
| Ability effect                  | up to 48 x 48            | Board effects canvas; unowned; centred on a cell, moved, scaled and faded by code (bead `pulp_wars-vkq.14`)           |

Ships use the unit classes (decided in bead `pulp_wars-67q.9`): the Patrol
Boat and the embarked transport are large units (72 x 88 and 72 x 72, since
the mastless barge is low), and the Battleship is a giant (88 x 96). They are
bottom-centred like every unit, with no water plate: the water tile is under
them.

Standard and large units keep their opaque pixels clear of the cell's HP
bar and seat-badge strips; giants are exempt, because every CHIBI overlay
(HP bar, seat badge, faction badge) is drawn after all pieces and stays
legible on top of giant art. Those two strips belong to the **Classic look**
(Settings > Developer tools). The default look since bead `pulp_wars-3tq.6`
draws no seat badge and no side bar: the player is shown by a base plate
under the unit's feet and a damaged unit's HP bar lies on that plate (see
[section 4a](#4a-the-new-owner-colour-rule-october-2026-direction)). The
clearance rule stays, so the classic look keeps working and the left strip
stays free for the faction, Field Defense and affliction markers.

**A unit on a settlement centre** (a city or a village, decided in bead
`pulp_wars-zhn`) is drawn at 0.75 of its normal size in the cell's
front-right: its canvas bottom stays on the cell's bottom edge and its right
edge sits at the left edge of the population-pip column. The settlement's
left side, roofs and upward overflow stay visible, so a garrisoned city
still reads as a city at zoom 0.75 and 1. The overlay frame does not move
(pips on the right; in the classic look the HP bar and seat badge in the
left strip and the crown top right; in the default look the unit keeps its
plate, and its damaged HP bar is shorter and lies under the reduced sprite). The reduced unit is smoothed unless it still lands on whole device
pixels. A unit moving off the settlement is drawn at full size.

Rules for resolution:

- **Generate at the display size. Never downscale a big render.** Every
  master is generated at its DPR 1 size above.
- **Denser screens use integer nearest-neighbour upscales** of the master:
  x2 for DPR 2 and x3 for DPR 3. The studies showed this beats separate
  high-resolution generations, which drift and thin the outline.
- **Zoom steps are discrete** so pixels stay crisp: 0.75, 1, 1.5 and 2. On DPR
  2 screens 1, 1.5 and 2 land on whole device pixels; 0.75 may look slightly
  soft. Fit-to-board stops at 0.75, and bigger boards scroll.
- **Generate cities larger than they need to be.** PixelLab draws towns small
  inside their canvas, so request a canvas wider than the tile (for example
  96 x 96 or 104 x 96) and accept a little side overflow; upward overflow is
  even more acceptable. A city must visibly fill its tile, well above the
  60% the flat-shaded test city reached.

## 4. Owner colour

**Scope since bead `pulp_wars-3tq.6`:** the rules of this section are current
behaviour only for art that is not converted to the new direction: the
ships, and everything the **Classic look** developer option draws. For the
Human faction, the Goblin faction (since bead `pulp_wars-3tq.9`), the Undead
faction (bead `pulp_wars-3tq.12`), the Dinosaur faction (bead
`pulp_wars-3tq.13`) and the shared improvements the default game follows
[section 4a](#4a-the-new-owner-colour-rule-october-2026-direction).

- Every unit, city and owned building has a large, solid owner-colour area:
  tunic, hood, roofs, banners or sails. It must read at a glance at zoom 0.75.
  The target is 20–40% of opaque pixels.
- Assets are generated with the owner areas in one **key colour** (bright
  red, `#d8262c`). Nothing else in the asset may be red or red-brown: every
  non-owner material, and its shading, uses colours that are clearly not red
  or red-brown. Each faction fragment chooses its own materials and their
  shading within this rule (see [factions](factions/README.md)).
- The pipeline extracts a **checked-in owner-mask PNG** per asset with strict
  thresholds. A mask-QA step rejects bleed onto non-owner materials, and a
  hand-corrected mask may be checked in as an override.
- Owned buildings (the batch-4 processors and the Shipyard) carry their owner
  area on red tile roofs or red cloth (sails, awnings) with a checked-in
  mask, like units and cities. The runtime recolours them with the territory
  owner's colour; a masked building on a tile no city owns is recoloured to a
  neutral stone grey, never shown in the raw key.
- The runtime recolours through the mask, never by matching hues at runtime.
  Nothing has a baked-in owner colour; the sprite review found ships with a
  fixed coral stripe.

### 4a. The new owner-colour rule (October 2026 direction)

The user chose a new direction on 2026-10-02 (bead `pulp_wars-3tq.4`; study
and production notes in
[VISUAL_DIRECTION_2026-10.md](VISUAL_DIRECTION_2026-10.md)). Bead
`pulp_wars-3tq.5` produced its art for the Human faction and the shared
improvements, and bead `pulp_wars-3tq.6` made it the default look of the
CHIBI art set (see
[Live default](VISUAL_DIRECTION_2026-10.md#13-live-default)). Where these
rules and the ones above differ, these win for converted art; the previous
look stays available as Settings > Developer tools > Classic look.

- **The player is shown by markers, not by garments or roofs:** a base plate
  under each unit (the player colour, with the seat's shape), a pennant
  drawn in code on a city, a Port and a Shipyard, the territory border, a
  ship's sail, and the interface. Small accents are allowed; whole garments
  and whole roofs in the player colour are not.
- **Faction colours are fixed and may be saturated.** A converted unit, city
  or portrait is drawn in its faction's colours for every player (Human:
  crimson and gold, see [ORIGINAL.md](factions/ORIGINAL.md)). A faction
  colour may be close to a player colour.
- **Buildings are neutral.** The improvements are one set shared by every
  faction, in the calm building style: about 70% of the tile (a 64 to 72 px
  canvas), a thin outline in a darker tone of each colour, cream plaster,
  dark oak, pale stone and terracotta roofs, no flag and no player colour in
  the art. The Farm is a full-cell pattern of crop rows with gaps that
  tiles without a seam: plump wheat sheaves on thin ridges of tilled soil. The Village is neutral straw and stone. The Mine
  stays part of the Mined Mountain terrain art and is toned with it.
- **Mask policy.** Converted units, cities and portraits have **no owner
  area and no mask**: their batch sets `fixedFactionColours`, each asset
  says `ownerColour: false`, no owner layer is sent and the registry entry
  carries `fixedColours: true` instead of `ownerMaskUrl` (a registry entry
  must have exactly one of the two). The key colour, mask extraction and
  mask QA are unchanged for everything not converted: ships (shared, sail in
  the player colour). The Goblins are converted (batch `direction-goblin`,
  bead `pulp_wars-3tq.9`): olive, moss and dark green skins, brown leather,
  rust and gunmetal scrap, on the classic canvases and anchors. So are the
  Undead (batch `direction-undead`, bead `pulp_wars-3tq.12`: pale bone, dark
  cloth, one violet accent) and the Dinosaurs (batch `direction-dinosaur`,
  bead `pulp_wars-3tq.13`: deep blue hide, cream, tawny spotted fur, one
  red-orange accent and a pattern per species).
- **Units stay chibi:** black outline, full saturation, the sizes and anchors
  of section 3. They are the only black-outlined, fully saturated pieces.
- **Chrome of the default look:** no numbered seat badge; the HP bar only
  for a damaged unit, a short bar on its plate; the ready cue as a bright
  rim round the plate; thin solid territory borders; Roads without the black
  casing: worn brown dirt tracks with a rough edge and an uneven fill,
  painted on the terrain's pixel grid (beads `pulp_wars-g6b5` and
  `pulp_wars-2yc.43`).
- **Not converted:** ships, terrain and resources. All four factions' land
  units, portraits and cities are converted (the Dinosaurs last, in bead
  `pulp_wars-3tq.13`). Ships keep the player-coloured sail and stand in a
  thin ring; terrain is toned by code. A unit, portrait or city whose
  direction raster fails to load falls back to its classic art: the
  player-coloured garment of section 4 on a plate, or the classic city with
  its owner recolour and capital crown, without a seat badge or a pennant.

## 5. Class notes

- **Units:** generate with `create-image-pixen`: `single color black outline`,
  `low detail`, south-east view. Each role needs a unique silhouette at zoom
  0.75 through its headgear, weapon, pose and mount. It must never differ
  only by a thin prop, which was the sprite review's top finding.
- **Cities and buildings:** generate large, then run an `edit-image-pixen`
  pass ("remove all ground … keep the buildings exactly the same") whenever
  a plate appears. In the tile-80 test, text-to-image put all 12 cities on a
  plate. City level tiers must differ clearly in size and silhouette.
- **Terrain:** terrain does not have to be chibi. The user preferred the
  flat-shaded grass, with less saturation than the neon lime of the test.
  Generate a larger field and take a deterministic seamless 80 x 80 crop,
  because text-to-image tiles come back framed. Make several variants so
  large areas don't look like wallpaper. Keep terrain calmer than the pieces.
- **Resources:** smaller and less saturated than units, recognisable by shape
  (fruit bush, grain tuft, deer or boar, ore crystals, fish, pearls).
- **UI icons and portraits:** keep the same outline and palette language, and
  judge them at their real UI size. They are generated at 48 x 48, the
  action tile, and shown 1:1 there and at 1.5x (whole device pixels on DPR 2)
  in 72 px cards and dialogs; the HUD coin and population icons are 32 x 32
  and are smoothed down to inline text size. Portraits are head-and-shoulders
  busts of the map piece (same headgear, owner garment and signature item)
  with an owner mask; ships and the Catapult are shown whole. Icons are one
  item floating on transparency: Pixen draws a round badge or frame behind
  anything it is told is an "icon", so the recipe calls it an item sprite.
  HUD and dock glyphs and the tactical status symbols stay vector (they
  follow the theme and high contrast); see the
  [inventory, flag 11](CHIBI_ASSET_INVENTORY.md#flags-the-plan-did-not-foresee).

## 6. Factions

Each faction adds a **faction fragment**, a short set of faction-wide
instructions, on top of this document. It must not override sections 2–4.
See [factions/README.md](factions/README.md). The baseline Human faction is
[factions/ORIGINAL.md](factions/ORIGINAL.md).

## Production workflow

Production raster art is generated with PixelLab only through checked-in,
programmatic scripts. Do not use a PixelLab MCP connector or a manual-only
workflow. Credentials remain in environment variables and never appear in
source, prompts, logs, manifests, or Beads.

Every script or manifest records prompt, negative prompt, requested dimensions,
model and settings, seed when supported, source-to-output mapping, and any
deterministic post-processing. Generate a small initial sample for an asset
class and inspect every result at native display scale and enlarged pixel scale.
Check the class rules plus silhouette, readability, composition, palette,
lighting, transparency, edge quality, consistency, and exact dimensions. Tile
review also checks every adjacency and map-level repetition.

After provider submission, the script saves a job-specific request receipt under
`art/pixellab/submissions/` before polling. Receipts contain resolved reference
hashes and request metadata, without credentials or image payloads. Keep these
receipts with the generation evidence. Recover an interrupted job with
`npx tsx scripts/art/pixellab.ts resume-job --id ASSET_ID --job-id JOB_ID`.
Recovery requires a matching receipt or generation record with complete reference
hashes and a compatible current recipe. Missing, conflicting, or unverifiable
history is rejected before fetching the job; current images cannot establish
which bytes were submitted earlier. A changed provider style reference retains
its historical hash. Ground and edge-style references reused by local processing
must match their stored hashes before recovery can proceed. An interruption before
the receipt is saved still requires independently recorded job provenance.

A successful generation request is not acceptance. Reject, adjust the recipe,
and regenerate anything ugly, unclear, inconsistent, technically wrong, or
outside this direction. Batch only after at least three representative assets
in that class pass individual review and the recipe is stable. Review batches
as contact sheets, then inspect suspected failures individually. The
orchestrator separately reviews accepted outputs before their task closes.

For both Original and Candy units, “sample” means exactly three representative
assets reviewed one at a time before any later batch. Later batches are small,
coherent role families of at most three assets; never request or accept a whole
roster in one generation batch. Giant units remain one-asset gates even after a
faction's standard and siege recipes have stabilized.

The asset-count paragraph above ("sample" means exactly three) was written
for the Ruleset 6 unit rosters and is the rule for every class: a small
sample of about three, each inspected at 1:1 and enlarged, before any batch.
The chibi pipeline and its commands are in [CHIBI_PIPELINE.md](CHIBI_PIPELINE.md),
the subject list in [CHIBI_ASSET_INVENTORY.md](CHIBI_ASSET_INVENTORY.md), and
the batches and their user reviews in the
[migration plan](CHIBI_MIGRATION_PLAN.md).

## Class contracts

- [Units](classes/units.md)
- [Terrain tiles](classes/terrain-tiles.md)
- [Buildings and settlements](classes/buildings.md)
- [Naval](classes/naval.md)
- [Curiosities](classes/curiosities.md)
- [UI](classes/ui.md)

## Frozen Ruleset 6 art

**Historical.** Everything below is the direction this file carried before
the chibi direction replaced it. It faithfully reproduces the
user-supplied root `art_direction.md` (which remains unchanged for
provenance) plus the map-scale measurements of the first production art. It
still describes the frozen art of Ruleset 6 and of the older screens under
`public/assets/pixellab/`, whose inventory and class gates are frozen in the
class contracts, and the earlier Ruleset 7 art that remains inside the
renderer as the last per-subject fallback of a chibi raster that cannot be
drawn. Nothing new is generated to it. Its tone, its insistence on
silhouette and its detail budget are still how the game should feel; where
its rendering rules (a clean 2D illustration, "not detailed pixel art", the
128 px cell, the diamond measurements) disagree with the sections above,
the sections above win.

That art was drawn for the [square-grid presentation](SQUARE_GRID_EXPERIMENT.md)
(axis-aligned 128 x 128 CSS-pixel cells, full-footprint ground, upward-only
overflow for genuinely tall map forms); the diamond measurements under
"Map-scale hierarchy" are older still and remain as acceptance provenance
for unchanged unit rasters.

The game should use a **chunky 2D illustrated strategy-game style**, not faux-3D or detailed pixel art.

The visual target is somewhere between **board-game pieces, stickers, and simple cartoon sprites**. It should feel playful, readable, slightly ridiculous, and capable of supporting wildly different pulp factions such as pirates, robots, undead, cowboys, ninjas, dinosaurs, aliens, etc.

### Core principles

- Prioritize **readability at gameplay scale** over detail.
- Every unit should be identifiable primarily from its **silhouette**.
- Use exaggerated visual shorthand: oversized hats, guns, swords, helmets, claws, backpacks, staffs, etc.
- Characters should be cute/chunky rather than realistically proportioned.
- Use large heads, short bodies, broad poses, and oversized equipment.
- Avoid detailed textures, realistic anatomy, realistic lighting, or intricate costumes.
- The style should tolerate slight inconsistencies between generated assets rather than requiring perfect character-model consistency.
- Factions should be visually distinct through shape language, costume, and a small palette of characteristic colors.

### Rendering style

Use:

- clean 2D illustration
- strong dark outlines
- mostly flat colors
- simple 2–3 level cel shading
- minimal gradients
- minimal texture
- simple highlights
- no photorealism
- no painterly rendering
- no complex ambient lighting
- no pseudo-3D rendering
- no isometric 3D models

The sprite should look intentionally drawn rather than like a rendered 3D object.

### Camera and pose

All gameplay units must use a consistent **three-quarter strategy-game view**, looking slightly downward at the character.

Characters should normally face approximately **down-right / southeast**.

Pose should be:

- compact
- dynamic but readable
- centered
- feet clearly visible
- weapon/tool clearly visible
- no extreme foreshortening

Do not generate dramatic cinematic poses.

### Sprite composition

Every unit sprite should:

- use the same canvas dimensions
- occupy roughly the same visual footprint for units of the same size class
- have a transparent background
- contain no scenery
- contain no text
- contain no UI
- contain no baked-in selection circle
- contain no complex cast shadow

The game will add standardized shadows, selection markers, health indicators, faction-color markers, etc.

Small units should fit a common bounding box. Large/giant units may deliberately exceed it, but their scale should be systematic.

### Detail budget

Assume that units will usually be seen **small on screen**.

Therefore:

Good:

- giant pirate hat
- eyepatch
- huge cutlass
- robot antenna
- glowing skeleton eyes
- enormous cowboy hat
- obvious dinosaur jaws

Bad:

- detailed belt buckles
- tiny facial details
- intricate fabric patterns
- realistic weapon mechanisms
- subtle material differences that disappear when scaled down

If a detail is not visible at normal game zoom, omit it.

### Terrain

Terrain should be **simpler and quieter than the units**.

Use clean tile shapes, broad areas of color, and only a few large decorative elements.

Examples:

- forest = several chunky stylized trees
- mountain = one or two exaggerated peaks
- farm = simple rows/crop shapes
- ruins = a few immediately recognizable broken structures
- water = simple surface with minimal wave decoration

Avoid covering tiles in small procedural detail.

The board should remain readable even when many units are present.

### Buildings and settlements

Buildings should follow the same chunky illustrated style.

They should be:

- highly simplified
- exaggerated
- recognizable from silhouette
- visually associated with their faction or function

Do not attempt realistic architecture.

A pirate settlement might have sails, wooden towers and a huge skull flag. A robot settlement might have antennae, pipes and geometric structures.

### Faction design

Each faction should have a strong visual gimmick.

Examples:

**Pirates**

- triangular hats
- coats
- wooden weapons/structures
- sails
- skull motifs
- exaggerated cannons

**Robots**

- boxy bodies
- antennas
- glowing simple face displays
- large mechanical joints
- clean geometric silhouettes

**Undead**

- skulls
- bones
- ragged cloaks
- oversized graveyard imagery
- green/purple magical accents

The goal is that a player should be able to recognize a faction **without reading any labels**.

### Tone

Aim for:

**charming + pulpy + silly + adventurous**

Not:

**dark + gritty + realistic + epic-serious**

Violence should read like toy soldiers or cartoon combat rather than gore.

The game world does not need stylistic realism. Pirates, robots, cowboys and dinosaurs can coexist. The common illustration style is what makes them feel like part of the same game.

### Consistency rule

When generating new assets, preserve this visual system more aggressively than individual reference-image details.

In particular, always preserve:

1. camera angle
2. sprite scale
3. outline thickness
4. body proportions
5. shading complexity
6. level of detail
7. transparent background
8. faction visual language

A technically attractive sprite that violates these rules is worse than a simpler sprite that matches the rest of the game.

### Map-scale hierarchy

The nominal ground diamond is 128 x 74 CSS pixels at 1x camera zoom. Ordinary
units are pieces **on** that diamond, not terrain-sized masses: their untrimmed
256 x 296 canvases display at `0.25` source scale, and their visible alpha should
occupy 28–44% of tile width, 66–80% of tile height, and no more than 45% of one
diamond's alpha-weighted area. A standard silhouette is rejected above 48%
tile width, 84% tile height, or 8% alpha-weighted coverage of either immediately
rear/above adjacent tile. Accepted Mountains and Forests remain materially wider
or taller than ordinary units.

Breacher/siege and Juggernaut/giant are bounded exceptions, never permission to
fill the tile. Siege uses `0.24` on 384 x 384 and may occupy 50–61% of tile width,
with hard caps of 66% width, 104% tile height, 58% diamond area, and 12%
rear-tile coverage. Giant uses `0.25` on 384 x 448 and targets 58–66% tile width,
with hard caps of 72% width, 135% tile height, and 18% rear-tile coverage. Giants
are always generated and accepted individually.

Rear-tile coverage is measured deterministically from source alpha: place the
source contact anchor at the owning tile center, apply display scale and any
documented cosmetic offset, sum `alpha / 255 * scale²` for source-pixel centers
inside each immediately adjacent projected diamond, then divide by diamond area
`128 * 74 / 2`. Logical NORTH and WEST project 37 CSS pixels above the owning
center and are the two rear/above neighbors. Zoom and DPR scale both reference
diamond and sprite uniformly, so the ratio is invariant.
