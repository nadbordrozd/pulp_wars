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
  red, `#d8262c`). Nothing else in the asset may be red or red-brown: shields,
  boots and bows use browns that are clearly not red.
- The pipeline extracts a **checked-in owner-mask PNG** per asset with strict
  thresholds. A mask-QA step rejects bleed onto non-owner materials, and a
  hand-corrected mask may be checked in as an override.
- The runtime recolours through the mask, never by matching hues at runtime.
  Nothing has a baked-in owner colour; the sprite review found ships with a
  fixed coral stripe.

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
  judge them at their real UI size.

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
