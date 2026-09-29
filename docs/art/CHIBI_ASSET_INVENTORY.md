# Chibi asset inventory

**Status:** written on 2026-09-29 for bead `pulp_wars-67q.2`. It lists every
sprite the Ruleset 7 game draws today and maps each one to a batch of the
[chibi migration](CHIBI_MIGRATION_PLAN.md). The batch beads take their
subject lists, canvases and anchors from here; where this inventory is more
precise than a bead, the inventory wins. [Flags](#flags-the-plan-did-not-foresee)
at the end list what the plan did not foresee.

## How it was built

The list comes from the Ruleset 7 runtime, not from the asset folders:

- the board plan in
  [`board-renderer-v7.ts`](../../src/render/canvas/board-renderer-v7.ts)
  (terrain, resources, improvements, sites, cities, treasure, units);
- the ID tables in [`ruleset7-ui-art.ts`](../../src/assets/ruleset7-ui-art.ts)
  and its revision files (units, portraits, technologies, commands,
  rewards);
- the DOM in [`app-view-v7.ts`](../../src/render/dom/app-view-v7.ts) and the
  display sizes in [`v7.css`](../../src/styles/v7.css);
- the art-set subjects in [`chibi-art-v7.ts`](../../src/assets/chibi-art-v7.ts).

Canvases are DPR 1 masters in CSS px at zoom 1 (one tile is 80 x 80), within
the limits of the [chibi direction, section 3](CHIBI_ART_DIRECTION.md#3-geometry-and-resolution).
Pixen needs multiples of 4, so every piece canvas below is one. The anchor
is the master pixel placed on the cell centre; "default" is the class
placement (`chibiAnchorV7`): bottom-centred pieces use
`(width / 2, height - 40)`, terrain and resources use the centre. Overflow is
beyond the 80 px cell, given as side / up. "Mask" means an owner mask is
required ([direction, section 4](CHIBI_ART_DIRECTION.md#4-owner-colour)).

## Map layer (canvas board)

These are the only sprites the `?art=chibi` runtime can replace today: each
row is one art subject in `chibi-art-v7.ts`.

| Subject                       | Legacy art today (variants)                                             | Batch | Chibi class   | Target canvas | Anchor  | Overflow side / up | Mask     | Notes                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------- | ----- | ------------- | ------------- | ------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `TERRAIN:GRASS`               | `terrain-ruleset7-original-grass-1..3` (3)                              | 1     | TERRAIN       | 80 x 80       | default | 0 / 0              | no       | Also drawn under Forest tiles whose canopy an improvement suppresses. 3 variants; field 160 x 160 + crop.  |
| `TERRAIN:FOREST`              | `terrain-ruleset7-original-forest-1..4` (4)                             | 1     | TALL_TERRAIN  | 80 x 104      | default | 0 / 24             | no       | Ground composite over an accepted Grass variant. See flag 3.                                               |
| `TERRAIN:MOUNTAIN`            | `terrain-ruleset7-revision3-mountain-1..3` (3)                          | 1     | TALL_TERRAIN  | 80 x 104      | default | 0 / 24             | no       | Legacy mountains sit on a gravel ground; chibi has no gravel subject. See flag 3.                          |
| `TERRAIN:MINED_MOUNTAIN`      | `terrain-ruleset7-revision3-mined-mountain-1..3` (3)                    | 3     | TALL_TERRAIN  | 80 x 104      | default | 0 / 24             | no       | This is the Mine: its art includes the mountain and covers its Road. See flag 4.                           |
| `TERRAIN:SHALLOW_WATER`       | `terrain-ruleset7-water-shallow` (1)                                    | 1     | TERRAIN       | 80 x 80       | default | 0 / 0              | no       | 2–3 variants recommended. Shorelines are procedural (flag 7).                                              |
| `TERRAIN:DEEP_WATER`          | `terrain-ruleset7-water-deep` (1)                                       | 1     | TERRAIN       | 80 x 80       | default | 0 / 0              | no       | 2–3 variants recommended.                                                                                  |
| `SITE:VILLAGE`                | `building-village`                                                      | 1     | SETTLEMENT    | 80 x 88       | default | 0 / 8              | no       | Neutral site: no owner colour. Must read clearly smaller than City 1.                                      |
| `CITY:1`                      | `building-city-1`                                                       | 1     | SETTLEMENT    | 88 x 96       | default | 4 / 16             | required | Generate large, edit away the plate. Capital cue: flag 5.                                                  |
| `CITY:2`                      | `building-city-2`                                                       | 1     | SETTLEMENT    | 96 x 100      | default | 8 / 20             | required | Level tiers differ in size and silhouette.                                                                 |
| `CITY:3`                      | `building-city-3`                                                       | 1     | SETTLEMENT    | 96 x 104      | default | 8 / 24             | required | Largest legal settlement canvas.                                                                           |
| `UNIT:FIGHTER`                | `unit-original-fighter`                                                 | 1     | STANDARD_UNIT | 56 x 80       | default | 0 / 0              | required | Redo of the tile-80 Fighter: its mask fails QA (red-brown shield, 10.5% owner area; see batch-0 evidence). |
| `UNIT:MARKSMAN`               | `unit-original-marksman`                                                | 1     | STANDARD_UNIT | 56 x 80       | default | 0 / 0              | required | Redo: the tile-80 bow and boots are red-brown (17% of pixels).                                             |
| `UNIT:RAIDER`                 | `unit-original-raider`                                                  | 2     | LARGE_UNIT    | 72 x 88       | default | 0 / 8              | required | Rider on a pony.                                                                                           |
| `UNIT:GUARD`                  | `unit-original-guard`                                                   | 2     | STANDARD_UNIT | 56 x 80       | default | 0 / 0              | required | Tower shield and spear.                                                                                    |
| `UNIT:CAPTAIN`                | `unit-original-captain-v7r10`                                           | 2     | STANDARD_UNIT | 56 x 80       | default | 0 / 0              | required | Medieval officer; no Napoleonic props.                                                                     |
| `UNIT:CATAPULT`               | `unit-original-catapult`                                                | 2     | LARGE_UNIT    | 72 x 88       | default | 0 / 8              | required | Siege: visibly bigger than standard units.                                                                 |
| `UNIT:KNIGHT`                 | `unit-original-knight` (revision-9 art)                                 | 2     | LARGE_UNIT    | 72 x 88       | default | 0 / 8              | required | Horse barding in owner colour.                                                                             |
| `UNIT:JUGGERNAUT`             | `unit-original-juggernaut`                                              | 2     | GIANT_UNIT    | 88 x 104      | default | 4 / 24             | required | Largest unit.                                                                                              |
| `UNIT:PATROL_BOAT`            | `unit-original-patrol-boat`                                             | 4     | LARGE_UNIT    | 72 x 88       | default | 0 / 8              | required | Owner-colour sail through the mask; no baked coral. Class choice: flag 6.                                  |
| `UNIT:BATTLESHIP`             | `unit-original-battleship`                                              | 4     | GIANT_UNIT    | 88 x 96       | default | 4 / 16             | required | Two-mast warship. Class choice: flag 6.                                                                    |
| `UNIT:EMBARKED_TRANSPORT`     | `unit-shared-embarked-transport`                                        | 4     | LARGE_UNIT    | 72 x 72       | default | 0 / 0              | required | One sprite for every embarked role today. A low mastless barge, so 72 x 72 (batch 4).                      |
| `RESOURCE:FRUIT`              | `terrain-square-original-fruit`, `…-fruit-pear`, `…-fruit-plum` (3)     | 3     | RESOURCE      | 48 x 48       | default | 0 / 0              | no       | 3 cosmetic variants chosen by the same coordinate hash.                                                    |
| `RESOURCE:GAME`               | `terrain-square-original-animal`, `…-game-deer`, `…-game-fox` (3)       | 3     | RESOURCE      | 48 x 48       | default | 0 / 0              | no       | 3 variants.                                                                                                |
| `RESOURCE:FERTILE_GROUND`     | `terrain-ruleset7-resource-fertile-ground`                              | 3     | RESOURCE      | 48 x 48       | default | 0 / 0              | no       | Grain tuft.                                                                                                |
| `RESOURCE:ORE`                | `terrain-square-ore`                                                    | 3     | RESOURCE      | 40 x 40       | default | 0 / 0              | no       | Ore crystals.                                                                                              |
| `RESOURCE:FISH`               | `terrain-ruleset7-resource-fish-v7r11`                                  | 3     | RESOURCE      | 40 x 40       | default | 0 / 0              | no       | On water; drawn above a Port.                                                                              |
| `RESOURCE:PEARLS`             | `terrain-ruleset7-resource-pearls`                                      | 3     | RESOURCE      | 40 x 40       | default | 0 / 0              | no       | On water.                                                                                                  |
| `TREASURE`                    | `building-treasure-chest`                                               | 3     | RESOURCE      | 40 x 40       | default | 0 / 0              | no       | The subject also allows BUILDING; a chest should stay below unit size.                                     |
| `IMPROVEMENT:FARM`            | `building-ruleset7-farm-single`, `…-farm-pair-horizontal`, `…-vertical` | 3     | BUILDING      | 80 x 88       | default | 0 / 8              | optional | Legacy pairs join two tiles; chibi has one subject. See flag 2.                                            |
| `IMPROVEMENT:LUMBER_CAMP`     | `building-ruleset7-resource-lumber-camp`                                | 3     | BUILDING      | 80 x 88       | default | 0 / 8              | optional | Suppresses the Forest canopy under it.                                                                     |
| `IMPROVEMENT:PORT`            | `building-ruleset7-port-v7r11`                                          | 3     | BUILDING      | 80 x 88       | default | 0 / 8              | optional | Drawn below a Fish resource on the same tile.                                                              |
| `IMPROVEMENT:MONUMENT`        | `building-square-monument`                                              | 3     | BUILDING      | 80 x 88       | default | 0 / 8              | optional |                                                                                                            |
| `IMPROVEMENT:WINDMILL`        | `building-square-windmill`                                              | 4     | BUILDING      | 80 x 88       | default | 0 / 8              | optional | Unique silhouettes at zoom 0.75 for all six processors.                                                    |
| `IMPROVEMENT:SAWMILL`         | `building-square-sawmill`                                               | 4     | BUILDING      | 80 x 88       | default | 0 / 8              | optional |                                                                                                            |
| `IMPROVEMENT:FORGE`           | `building-square-forge`                                                 | 4     | BUILDING      | 80 x 88       | default | 0 / 8              | optional |                                                                                                            |
| `IMPROVEMENT:WORKSHOP`        | `building-square-workshop`                                              | 4     | BUILDING      | 80 x 88       | default | 0 / 8              | optional |                                                                                                            |
| `IMPROVEMENT:MARKET`          | `building-square-market`                                                | 4     | BUILDING      | 80 x 88       | default | 0 / 8              | optional |                                                                                                            |
| `IMPROVEMENT:SHIPYARD`        | `building-ruleset7-shipyard`                                            | 4     | BUILDING      | 80 x 88       | default | 0 / 8              | optional |                                                                                                            |
| `IMPROVEMENT:MINE` (not used) | none: a Mine draws `TERRAIN:MINED_MOUNTAIN`                             | —     | —             | —             | —       | —                  | —        | The subject exists but the renderer never emits it (flag 4).                                               |

"Optional" masks: the contract requires masks only for units and cities.
Improvements are drawn with their territory owner's colour available, so a
batch may give them an owner area; decide per batch (flag 8).

**Undead subjects (revision 13, bead `pulp_wars-vkq.12`).** An Undead land
unit asks for `UNIT:UNDEAD:<ROLE>` (Skeleton `FIGHTER`, Ghoul `RAIDER`,
Banshee `MARKSMAN`, Zombie `GUARD`, Necromancer `CAPTAIN`, Lich `CATAPULT`,
Vampire `KNIGHT`, Abomination `JUGGERNAUT`) with the canvas, class and mask
of the Human role above, and falls back to the Human `UNIT:<ROLE>` sprite
plus the Undead badge while it has no usable raster. Undead Patrol Boats,
Battleships and embarked transports always use the Human subjects. `GRAVE`
is the unowned Grave marker: RESOURCE, 40 x 40, centred, no mask; without a
raster (and in LEGACY) the code-drawn marker stays. Prompts and recipes:
[UNDEAD.md](factions/UNDEAD.md) and `scripts/art/chibi/batches/batch-undead.json`.

## Map overlays drawn in code (no raster today)

| Overlay                                                   | Drawn by                                         | Plan batch     | Notes                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------- |
| Roads and road joins                                      | `drawRoad` strokes in `board-renderer-v7.ts`     | 3              | No raster and no art subject. Flag 1.                                                 |
| Field Defense and city fortification level                | tactical symbol `ui-action-field-defense`        | 3 (Field Def.) | A vector symbol with light, dark and high-contrast treatments. Flag 1.                |
| Status attachments (Port active/blockaded, inspired, ...) | `ruleset7-tactical-ui-symbols.ts` vector symbols | 5              | 20 vector symbols; not rasters.                                                       |
| Fog of war                                                | flat fill and stroke                             | —              | Keep procedural unless the user asks.                                                 |
| Water boundaries and shorelines                           | `addWaterBoundaries`                             | —              | Flag 7.                                                                               |
| HP bars, seat badges, population pips, values, labels     | renderer                                         | —              | Placement must be checked against bottom-aligned chibi units (batch 1 bead notes).    |
| Selection ring, glow, jump, sea routes, support feedback  | renderer                                         | —              | Selection glow and link-exclusion boxes still use legacy sprite bounds (67q.1 notes). |
| Ground fill under chibi terrain                           | `#65965b` fill in the chibi ground pass          | —              | Visible only while a terrain raster is loading or missing.                            |

## Interface rasters (DOM)

These are all drawn with `<img class="v7-art-frame">` from
`ACCEPTED_ART_URLS`. The `?art=chibi` switch does not reach the DOM today
(flag 9), so every row stays legacy until batch 5 adds a DOM art-set hook.
Display sizes are CSS px at UI scale 1.

| Use                                        | Legacy art today                                                                                                                                                                                                                                                                                                                                                        | Display size                                                    | Batch | Notes                                                                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit portraits (selection dock, unit help) | `portrait-original-fighter`, `-raider`, `-marksman`, `-guard`, `-captain-v7r10`, `-catapult`, `-knight` (rev. 9), `-juggernaut`                                                                                                                                                                                                                                         | 112 x 130 frame; 72 x 72 in dialogs                             | 5     | 8 land roles. Patrol Boat and Battleship use their map sprites as portraits (flag 10).                                                                    |
| Map-art identities in the dock             | the map sprite of the selected terrain, resource, improvement, city or unit                                                                                                                                                                                                                                                                                             | 112 x 130 frame                                                 | 1–4   | The dock shows map art at portrait size, so it needs the chibi map rasters through the DOM hook (flag 9).                                                 |
| Technology icons (23)                      | 8 are dedicated, portrait or action art: `portrait-original-captain-v7r10` (Administration), `ui-reward-expand` (Planning), `ui-tech-original-marksmanship`, `ui-tech-original-fieldcraft`, `portrait-original-raider` (Scouting), `ui-action-pillage` (Raiding), `ui-tech-fortification`, `ui-action-blast-mountain-v7r9` (Explosives); the other 15 reuse map sprites | 72 x 72                                                         | 5     | The 15 map sprites: fruit, farm, windmill, animal, lumber camp, sawmill, road mask, market, Knight, Guard, mountain, forge, port, deep water, battleship. |
| Command and action buttons                 | `ui-action-heal`, `-recover`, `-promote`, `-pillage`, `-disband`, `-wait`, `-clear-forest`, `-replant-forest`, `-redevelop`, `-end-turn`, `-rally-v7r9`, `-cultivate-forest-v7r9`, `-blast-mountain-v7r9`; build, harvest and train commands reuse map or unit sprites                                                                                                  | 48 x 48                                                         | 5     | `CAPTURE` shows the village; `BUILD_ROAD` and the Roads technology show `terrain-square-road-mask-0101`.                                                  |
| City rewards                               | `ui-reward-survey`, `ui-reward-city-wall`, `ui-reward-expand`, `ui-hud-gold-coin-v7` (Stockpile, Treasury), `ui-hud-population` (Boom), Fighter portrait (Militia), Juggernaut portrait                                                                                                                                                                                 | 80 x 80                                                         | 5     |                                                                                                                                                           |
| HUD economy icons                          | `ui-hud-gold-coin-v7`, `ui-hud-population`                                                                                                                                                                                                                                                                                                                              | 30 x 30 in the HUD; 16–24 elsewhere; 26 x 26 on the leaderboard | 5     | Must stay legible at 16 px.                                                                                                                               |
| Setup screen and train buttons             | `building-city-1` on the setup screen; unit sprites on train buttons                                                                                                                                                                                                                                                                                                    | 72 x 72 (setup); 48 x 48 (train)                                | 5     | Train buttons show map sprites, so they follow the DOM hook (flag 9).                                                                                     |

## Interface vector graphics (no raster today)

| Graphic                 | Source                                     | Count | Batch | Notes                                                                                 |
| ----------------------- | ------------------------------------------ | ----- | ----- | ------------------------------------------------------------------------------------- |
| HUD and dock glyphs     | `ui-icons-v7.ts` (SVG paths, currentColor) | 15    | 5     | Follow the theme and high contrast. Flag 11.                                          |
| Tactical status symbols | `ruleset7-tactical-ui-symbols.ts`          | 20    | 5     | Includes achievements, Field Defense, Port status, blackout and concealment. Flag 11. |

## Legacy IDs not reachable in Ruleset 7

These appear only in the painted-bounds table of
[`selection-identity-v7.ts`](../../src/render/dom/selection-identity-v7.ts)
or in superseded revision tables. Nothing in Ruleset 7 draws them, so no
batch replaces them: `unit-original-scout`, `-medic`, `-breacher`, `-heavy`,
`-saboteur`, `-horse-archer`, `unit-original-captain` (revision 9),
`portrait-original-captain` (revision 9), `building-ruleset7-port`,
`building-ruleset7-lumber-camp`, `building-square-grand-works`,
`terrain-ruleset7-resource-fish`, `terrain-square-fertile-ground`.

## Counts per batch

| Batch | Map subjects                                                                                      | Minimum rasters (with the variants above)                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Grass, Forest, Mountain, Shallow and Deep Water, Village, City 1–3, Fighter, Marksman             | about 19: 3 grass, 2–3 forest, 2–3 mountain, 2 + 2 water, 4 settlements, 2 units                                                                      |
| 2     | Raider, Guard, Captain, Catapult, Knight, Juggernaut                                              | 6                                                                                                                                                     |
| 3     | 6 resources, Treasure, Farm, Lumber Camp, Port, Monument, Mined Mountain; Roads and Field Defense | about 17 plus 2–3 mined mountains; Roads and Field Defense need a decision first                                                                      |
| 4     | Windmill, Sawmill, Forge, Workshop, Market, Shipyard, Patrol Boat, Battleship, Embarked form      | 9                                                                                                                                                     |
| 5     | portraits, 23 technology icons, action, reward and HUD art                                        | 8 portraits, 3 dedicated technology icons plus 5 reused portraits or actions, 13 action icons, 3 reward icons, 2 HUD icons; vector glyphs by decision |

## Flags the plan did not foresee

1. **Roads and Field Defense are not sprites.** Roads are two brown strokes
   drawn per cell, and Field Defense is a vector tactical symbol. The
   runtime has no art subject for either, so batch 3 cannot "replace" them
   by registering rasters. Batch 3 needs a user decision: restyle them in
   code (a `ui/presentation` change), or add road or defense subjects to
   the runtime first. **Batch 3 decision:** restyle in code, CHIBI only
   (LEGACY unchanged). Roads are a beige cobblestone path (`#d8c08c`) with
   the pieces' near-black casing (`CHIBI_ROAD_STROKES_V7`), and every road
   casing is drawn before any road fill so corner joins read as one path.
   Field Defense is a palisade badge (four pale birch stakes on a light
   steel crossbar, thick outline) in the cell's top-left corner above the
   HP bar strip (`CHIBI_OVERLAY_FRAME_V7.fieldDefense`); a city's
   fortification level is written on it, and it is drawn with the deferred
   piece overlays so no tall piece hides it. Known gap: CHIBI tall terrain
   draws its whole owning cell in the ground pass, so a Road on a Forest,
   Mountain or Mine is drawn across the tree or rock body (legacy draws the
   body over the Road); fixing it needs a body-only chibi raster.
2. **Farm pairs.** Legacy Farms join into horizontal and vertical two-tile
   fields. Chibi has one `IMPROVEMENT:FARM` subject and no pair logic, so a
   chibi Farm is a single-tile building unless the runtime gains pair
   subjects. **Batch 3 decision:** one single-cell Farm (a barn with a
   haystack and wheat) is drawn for every Farm cell, paired or not; the
   CHIBI path ignores the legacy pair crop, so a pair reads as two
   neighbouring farmsteads.
3. **Tall-terrain ground.** Chibi Forest and Mountain masters contain their
   own 80 x 80 ground cell (the runtime draws the cell during the ground
   pass). The pipeline composes them over an accepted ground tile. Legacy
   mountains stand on gravel, but no gravel subject exists; batch 1 must
   choose the ground for mountains (grass, or a pipeline-only gravel tile
   that is never registered as a subject). **Batch 1 decision:** grass.
   Every Forest and Mountain composites over `chibi-grass-1`, so tall
   terrain joins the surrounding meadow without a seam; the Mined Mountain
   (batch 3) should do the same.
4. **Mine is a terrain subject.** A Mine draws `TERRAIN:MINED_MOUNTAIN` (the
   art includes the mountain); `IMPROVEMENT:MINE` is never emitted. Batch 3
   lists "Mine" as an improvement; it is really a tall-terrain variant of
   batch 1's Mountain and must match it. **Batch 3 decision:** each Mined
   Mountain is an `edit-image-pixen` of the matching accepted batch-1
   Mountain body (a cross-batch edit source) with a timber mine entrance
   and an ore cart, composited on `chibi-grass-1`; the two variants follow
   the Mountain variant order, so a Mine keeps its mountain's shape. The
   CHIBI art set does not draw the Ore resource over a Mine (the cart shows
   it) or Fertile Ground under a Farm (`coveredByImprovement`); LEGACY
   still draws both.
5. **Capital cue.** Nothing on the map marks the capital today apart from
   its label. Batch 1 mentions a capital cue; that needs a new subject or a
   code overlay. **Batch 1 decision:** a code overlay. Plan entries for a
   capital carry `capital: true`, and the CHIBI art set draws a small gold
   crown with the seat badge's outline in the top-right corner of the
   cell. That corner lies outside a standard unit's 56 px width, so a
   garrisoned unit never hides it. It needs no raster per city tier and
   leaves LEGACY unchanged.
6. **Ships have no class in the direction.** The size table has no row for
   boats. This inventory proposes LARGE_UNIT for the Patrol Boat and
   embarked form and GIANT_UNIT for the Battleship; confirm in batch 4.
   **Batch 4 decision:** as proposed. The Patrol Boat is 72 x 88 and the
   Battleship 88 x 96; the embarked transport, a low mastless barge, is a
   72 x 72 LARGE_UNIT (no upward overflow). Ships use their own `ship`
   recipe class (a boat class text with no water, waves or plate) and are
   recorded in the [direction, section 3](CHIBI_ART_DIRECTION.md#3-geometry-and-resolution).
   Undead naval units have the same role ids and reuse these sprites with
   the Undead skull badge.
7. **Shorelines.** Water boundaries are drawn in code over the terrain. With
   chibi water they may need restyling; no batch owns them.
8. **Owner colour on improvements.** The direction says owned buildings
   carry an owner area, but the runtime contract only requires masks for
   units and cities. Decide per batch whether improvements get masks.
   **Batch 3 decision:** buildings carry owner colour where it is natural
   in the ORIGINAL vocabulary, always with a checked-in mask: the Farm and
   Lumber Camp roofs, the Port roof and flag, the Monument banners (16–29%
   of opaque pixels). Resources, Treasure and the Mine are unowned map
   features with no owner colour. Deep crimson roof shading falls just
   outside the automatic extraction band, so the Farm, Port and Monument
   use keyLike-band overrides (no QA waiver).
   **Batch 4 decision:** the same rule for the six batch-4 buildings: red
   tile roofs, the Windmill's red cloth sails and the Market's red striped
   cloth, with strict auto masks (22–34%, no overrides). For every owned
   building of both batches the runtime recolours the mask with the
   territory owner's colour, or with a neutral stone grey
   (`CHIBI_UNOWNED_OWNER_COLOUR_V7`) when the tile has no owner, so the raw
   key never shows.
9. **The DOM ignores the art set.** `?art=chibi` switches only the canvas.
   Selection docks, technology cards, action buttons and rewards keep
   legacy art, including legacy map sprites of chibi subjects. Batch 5 (or
   an earlier runtime bead) needs a DOM art-set hook, or chibi games will
   show both styles side by side.
10. **Ships have no portraits.** Patrol Boat and Battleship use their map
    sprites as portraits; batch 5 should add portraits or keep that reuse on
    purpose.
11. **HUD glyphs and tactical symbols are vector.** They already follow the
    theme and high contrast. Batch 5 should decide with the user whether they
    stay vector (recommended) or become pixel art.
12. **The tile-80 Fighter and Marksman fail the strict mask QA.** Their
    shields, boots and bows are red-brown. Batch 1 must regenerate them with
    "browns that are clearly not red" rather than reuse them.
