# Chibi art direction

**Status:** approved by the user on 2026-09-29 as the target style for all
Ruleset 7 art. It governs every new asset made for the chibi art set. The
[current art direction](ART_DIRECTION.md) still describes the legacy
production art until the
[migration](CHIBI_MIGRATION_PLAN.md) cuts over; on cutover this document is
folded into it. Where the two disagree for chibi work, this document wins.

The decision rests on two studies:

- the [style exploration](STYLE_EXPLORATION_2026-09.md), which compared six
  PixelLab styles;
- the [tile-80 style test](TILE80_STYLE_TEST_2026-09.md), where the user chose
  Bold chibi for units and preferred the flat-shaded grass.

The problems the new style must fix come from the
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
legible on top of giant art.

**A unit on a settlement centre** (a city or a village, decided in bead
`pulp_wars-zhn`) is drawn at 0.75 of its normal size in the cell's
front-right: its canvas bottom stays on the cell's bottom edge and its right
edge sits at the left edge of the population-pip column. The settlement's
left side, roofs and upward overflow stay visible, so a garrisoned city
still reads as a city at zoom 0.75 and 1. The overlay frame does not move
(HP bar and seat badge in the left strip, pips on the right, crown top
right). The reduced unit is smoothed unless it still lands on whole device
pixels. A unit moving off the settlement is drawn at full size, and the
legacy art set is unchanged.

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
improvements; bead `pulp_wars-3tq.6` makes it the default. Until then the
rules above describe the default rendering, and these describe the
direction the developer toggle draws. Where they differ, these win for
converted art.

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
  tiles without a seam. The Village is neutral straw and stone. The Mine
  stays part of the Mined Mountain terrain art and is toned with it.
- **Mask policy.** Converted units, cities and portraits have **no owner
  area and no mask**: their batch sets `fixedFactionColours`, each asset
  says `ownerColour: false`, no owner layer is sent and the registry entry
  carries `fixedColours: true` instead of `ownerMaskUrl` (a registry entry
  must have exactly one of the two). The key colour, mask extraction and
  mask QA are unchanged for everything not converted: ships (shared, sail in
  the player colour), and the Undead, Goblin and Dinosaur units, cities and
  portraits.
- **Units stay chibi:** black outline, full saturation, the sizes and anchors
  of section 3. They are the only black-outlined, fully saturated pieces.
- **Not converted yet:** the other three factions, ships, terrain and
  resources. With the toggle on they are drawn as today (terrain toned by
  code).

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

## 7. Workflow

The general PixelLab rules in [ART_DIRECTION.md](ART_DIRECTION.md#production-workflow)
and in `CLAUDE.md` still apply:

- generate only through checked-in scripts;
- record the prompt, negative prompt, settings, seed and sizes, and keep
  receipts;
- make a small sample first and inspect every output at 1:1 and enlarged;
- switch to batch generation only after about three accepted samples;
- reject anything ugly, unclear or off-style.

The chibi batches and their user reviews are listed in the
[migration plan](CHIBI_MIGRATION_PLAN.md).
