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
| `TERRAIN:MOUNTAIN`            | `terrain-ruleset7-revision3-mountain-1..3` (3)                          | 1     | TALL_TERRAIN  | 80 x 104      | default | 0 / 24             | no       | Stands on the rocky ground tile `chibi-mountain-ground-1` (`pulp_wars-6gd.5`). See flag 3.                 |
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
| `RESOURCE:ORE`                | `terrain-square-ore`                                                    | 3     | RESOURCE      | 40 x 40       | default | 0 / 0              | no       | Ore chunks: copper-orange on a dark rock, so they read on grey Mountains (batch `ore-2`, `pulp_wars-pa3`). |
| `RESOURCE:FISH`               | `terrain-ruleset7-resource-fish-v7r11`                                  | 3     | RESOURCE      | 40 x 40       | default | 0 / 0              | no       | On water; drawn above a Port.                                                                              |
| `RESOURCE:PEARLS`             | `terrain-ruleset7-resource-pearls`                                      | 3     | RESOURCE      | 40 x 40       | default | 0 / 0              | no       | On water.                                                                                                  |
| `TREASURE`                    | `building-treasure-chest`                                               | 3     | RESOURCE      | 40 x 40       | default | 0 / 0              | no       | The subject also allows BUILDING; a chest should stay below unit size.                                     |
| `IMPROVEMENT:FARM`            | `building-ruleset7-farm-single`, `…-farm-pair-horizontal`, `…-vertical` | 3     | BUILDING      | 80 x 88       | default | 0 / 8              | no       | A field of grain, no building, no mask (`pulp_wars-6gd.5`). See flag 2.                                    |
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

**Undead direction art (bead `pulp_wars-3tq.12`).** The default look
resolves a second set first, batch `direction-undead`, registered in
[`chibi-direction-undead-art-manifest.ts`](../../src/assets/chibi-direction-undead-art-manifest.ts):
`chibi-direction-undead-<unit>` for the eight `UNIT:UNDEAD:<ROLE>` subjects
(the canvases and anchors of the classic sprites, `fixedColours`, no mask),
`chibi-direction-portrait-undead-<unit>` for `PORTRAIT:UNDEAD:<ROLE>`
(48 x 48, `fixedColours`), `chibi-direction-icon-action-<name>` for
`ICON:ACTION:RAISE_DEAD`, `ICON:ACTION:DEVOUR`, `ICON:ACTION:WAIL` and
`ICON:ACTION:UNDEAD:RALLY` (48 x 48), and `chibi-direction-effect-<name>`
for `EFFECT:WAIL`, `EFFECT:SPLASH`, `EFFECT:RAISE` and `EFFECT:WISP` (the
classic sprites in the violet palette, batch `effects-undead`). The classic
assets above stay registered: the Classic look draws them, and a direction
raster that fails to load falls back to them. `STATUS:PLAGUED`,
`STATUS:BITTEN`, `EFFECT:CURE` and `GRAVE` have no direction art.

**Goblin subjects (revision 17, bead `pulp_wars-0ao.8`).** A Goblin land
unit asks for `UNIT:GOBLIN:<ROLE>` (Goblin `FIGHTER`, Wolf Rider `RAIDER`,
Bomb Chucker `MARKSMAN`, Orc Brute `GUARD`, Orc Warboss `CAPTAIN`, Rocket
Cart `CATAPULT`, Scrap Buggy `KNIGHT`, Troll `JUGGERNAUT`) with the canvas,
class and mask of the Human role above. Three anchors move right of the
default so the art clears the HP bar and seat badge: the Orc Warboss's cape
by 1 px (`27, 40`), the Scrap Buggy's rear wheel by 4 px (`32, 48`) and the
fireworks Rocket Cart's rear wheel and tail fin by 2 px (`34, 48`, bead
`pulp_wars-6gd.5`). The
rasters are PixelLab art from batch `goblin`
(`scripts/art/chibi/batches/batch-goblin.json`), and the dock, training
buttons and technology cards use the `PORTRAIT:GOBLIN:<ROLE>` busts of batch
`5-goblin` (the Rocket Cart and Scrap Buggy shown whole). Without a usable
raster (and always in LEGACY) a Goblin unit or portrait draws the Human art
of its role with the Goblin badge, an olive goblin head on a charcoal disc
in the Undead badge's corner. Goblin Patrol Boats, Battleships and embarked
transports use the Human subjects, with the badge. Prompts and recipes:
[GOBLIN.md](factions/GOBLIN.md) and `scripts/art/chibi/subjects/GOBLIN.json`;
review evidence: `npm run art:chibi-goblin-review` into
`art/pixellab/reviews/chibi-batch-goblin/`. Since bead `pulp_wars-3tq.9` the
default look draws the fixed-colour art of batch `direction-goblin` for the
same subjects (see
[its section](#new-visual-direction-batch-direction-goblin-bead-pulp_wars-3tq9));
the masked rasters of batches `goblin` and `5-goblin` are what the Classic
look and a failed direction raster draw. The programmatic placeholders of
bead `pulp_wars-0ao.4` and their generator were removed when this art was
registered; their evidence stays in
`art/pixellab/reviews/chibi-goblin-placeholders/`.

**Dinosaur subjects (revision 19, bead `pulp_wars-c87.7`).** A Dinosaur land
unit asks for `UNIT:DINOSAUR:<ROLE>` (Caveman `FIGHTER`, Raptor `RAIDER`,
Spitter `MARKSMAN`, Ankylosaurus `GUARD`, Shaman `CAPTAIN`, Triceratops
`CATAPULT`, T-Rex `KNIGHT`, Brontosaurus `JUGGERNAUT`) with the canvas, class
and mask of the Human role above. Three anchors move right of the default so
the art clears the HP bar and seat badge: the Raptor's tail by 2 px
(`34, 48`), the Triceratops's tail by 2 px (`34, 48`) and the T-Rex's
blanket hem by 6 px (`30, 48`). An Egg (a unit of form `EGG`, whatever role
is inside) asks for `UNIT:DINOSAUR:EGG`: `chibi-dinosaur-egg`, a
`STANDARD_UNIT` of 48 x 48, bottom-centred on its tile (anchor `24, 8`),
with an owner mask; it has no fallback subject. The rasters are PixelLab art
from batch `dinosaur` (`scripts/art/chibi/batches/batch-dinosaur.json`), and
the dock, training buttons and technology cards use the
`PORTRAIT:DINOSAUR:<ROLE>` busts of batch `5-dinosaur` (the Ankylosaurus
shown whole). Without a usable raster (and always in LEGACY) a Dinosaur unit
or portrait draws the Human art of its role with the Dinosaur badge, a
dusty-blue three-toed footprint on a charcoal disc in the Undead badge's
corner. Dinosaur Patrol Boats, Battleships and embarked transports use the
Human subjects, with the badge. Prompts and recipes:
[DINOSAUR.md](factions/DINOSAUR.md) and
`scripts/art/chibi/subjects/DINOSAUR.json`; review evidence:
`npm run art:chibi-dinosaur-review` into
`art/pixellab/reviews/chibi-batch-dinosaur/`.

**Dinosaur direction art (bead `pulp_wars-3tq.13`).** The default look
resolves a second set first, batch `direction-dinosaur`, registered in
[`chibi-direction-dinosaur-art-manifest.ts`](../../src/assets/chibi-direction-dinosaur-art-manifest.ts):
`chibi-direction-dinosaur-<unit>` for the eight `UNIT:DINOSAUR:<ROLE>`
subjects (the canvases and anchors of the classic sprites, `fixedColours`,
no mask), `chibi-direction-dinosaur-egg` for `UNIT:DINOSAUR:EGG` (48 x 48,
anchor `24, 8`, `fixedColours`),
`chibi-direction-portrait-dinosaur-<unit>` for `PORTRAIT:DINOSAUR:<ROLE>`
(48 x 48, `fixedColours`), and `chibi-direction-icon-action-<name>` for
`ICON:ACTION:LAY_EGG`, `ICON:ACTION:HATCH` and `ICON:ACTION:STAMPEDE`
(48 x 48). The classic assets above stay registered: the Classic look draws
them, and a direction raster that fails to load falls back to them.
`ICON:ACTION:DINOSAUR:RALLY` (War Drums) has no direction art. With this
batch every `UNIT:`, `PORTRAIT:` and `CITY:` subject of the four factions
has a fixed-colour asset in the default look; the ships (`UNIT:PATROL_BOAT`,
`UNIT:BATTLESHIP`, `UNIT:EMBARKED_TRANSPORT` and their two portraits) are
the only masked ones left. Review evidence:
`npm run art:chibi-dinosaur-direction-review` into
`art/pixellab/reviews/chibi-batch-direction-dinosaur/`.

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
`ACCEPTED_ART_URLS` in LEGACY. Batch 5 added the DOM art-set hook (flag 9),
so with `?art=chibi` each row asks for a chibi subject first; see
[Batch 5: the interface in CHIBI](#batch-5-the-interface-in-chibi). Display
sizes are CSS px at UI scale 1. (LEGACY's selection dock and unit help show
the unit's map sprite, not its portrait; LEGACY portraits appear only in
rewards and on technology cards.)

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

## Batch 5: the interface in CHIBI

Bead `pulp_wars-67q.11`. Records: `scripts/art/chibi/records/batch-5.json`
(ORIGINAL), `batch-5-undead.json` (UNDEAD) and `batch-5-goblin.json`
(GOBLIN portraits, bead `pulp_wars-0ao.8`, and the Kaboom! and WAAAGH!
command icons, bead `pulp_wars-0ao.14`) and `batch-5-dinosaur.json`
(DINOSAUR portraits and the Lay Egg, Hatch, Stampede and War Drums command
icons, bead `pulp_wars-c87.7`); masters under
`public/assets/chibi/portraits/` and `public/assets/chibi/icons/`.

**The DOM hook.** [`chibi-dom-art-v7.ts`](../../src/render/dom/chibi-dom-art-v7.ts)
resolves a subject through the canvas resolver (same registry, same
faction fallback, same mask recolour and neutral stone for masked art
without an owner), trims the raster to its painted pixels and returns a
data URL. The app view asks for a subject wherever it drew legacy art and
keeps the legacy `<img>` unchanged when the subject has no usable raster;
LEGACY builds no hook at all, so its markup is unchanged. Images are sized
in rem to a whole or half step of the master (1:1 in 48 px tiles, 1.5x in
72 px cards, which lands on whole device pixels at DPR 2); art too big for
its box is fitted and smoothed. The coin and population icons that the text
helpers inline everywhere come from a per-document provider the CHIBI view
registers.

| Interface use                       | CHIBI subject                                                                                                                                                                                    | Owner colour            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| Selection dock and unit help (unit) | the unit's map subject (`UNIT:<ROLE>`, `UNIT:UNDEAD:<ROLE>`, `UNIT:GOBLIN:<ROLE>`, embarked transport)                                                                                           | the unit's owner        |
| Selection dock (city, tile)         | `CITY:<level>`, or `CITY:UNDEAD:<level>` or `CITY:GOBLIN:<level>` by the city owner's faction; the improvement, resource or terrain map subject (a Mine is its mined mountain)                   | city or territory owner |
| Train buttons, recruit help         | `PORTRAIT:<ROLE>`; `PORTRAIT:UNDEAD:<ROLE>` or `PORTRAIT:GOBLIN:<ROLE>` for an Undead or Goblin viewer's land roles                                                                              | the viewer              |
| Technology cards and detail         | `CHIBI_TECH_ART_SUBJECTS_V7` in [`chibi-ui-art-v7.ts`](../../src/assets/chibi-ui-art-v7.ts)                                                                                                      | the viewer              |
| Command and action buttons          | `ICON:ACTION:<KIND>` (Frenzy: `ICON:ACTION:UNDEAD:RALLY`; WAAAGH!: `ICON:ACTION:GOBLIN:RALLY`; Kaboom!: `ICON:ACTION:KABOOM`); build and harvest commands their map subject; Capture the Village | the viewer              |
| City rewards                        | `ICON:REWARD:*`, `ICON:HUD:COIN` (Stockpile, Treasury), `ICON:HUD:POPULATION` (Boom), faction portraits (Militia, Juggernaut)                                                                    | the viewer              |
| Leaderboard city count              | `CITY:1`, or `CITY:UNDEAD:1` or `CITY:GOBLIN:1` by that player's faction                                                                                                                         | that player             |
| Inline and HUD coin and population  | `ICON:HUD:COIN`, `ICON:HUD:POPULATION`                                                                                                                                                           | none                    |

A Dinosaur viewer or owner follows the same rows: `UNIT:DINOSAUR:<ROLE>`
(an Egg: `UNIT:DINOSAUR:EGG`), `CITY:DINOSAUR:<level>`,
`PORTRAIT:DINOSAUR:<ROLE>`, War Drums `ICON:ACTION:DINOSAUR:RALLY`, and
`ICON:ACTION:LAY_EGG`, `ICON:ACTION:HATCH` and `ICON:ACTION:STAMPEDE` for the
three Dinosaur commands (`commandSubjectV7` derives them from the command
kind; the interface that offers them is bead `pulp_wars-c87.4`).

Undead, Goblin and Dinosaur portraits, Frenzy, WAAAGH! and War Drums fall
back to the Human art
(with the faction badge on units, as on the map) while they have no raster;
with their own art the badge is dropped. Kaboom! has no Human counterpart:
without its raster, and always in LEGACY, it keeps the code-drawn bomb glyph
of `ui-icons-v7.ts`.

**Technology cards.** Where LEGACY reuses a map sprite, CHIBI reuses the
chibi map sprite (Gathering the Fruit bush, Farming the Farm, Chivalry the
Knight, Naval Engineering the Battleship, and so on; an Undead viewer's
Chivalry and Drill show the Vampire and Zombie, a Goblin viewer's the Scrap
Buggy and Orc Brute, a Dinosaur viewer's the T-Rex and Ankylosaurus). Portrait and action reuse
follows LEGACY too: Administration the Captain portrait, Scouting the
Raider, Marksmanship the Marksman, Planning the Expand reward, Raiding
Pillage, Explosives Blast Mountain, Roads Build Road. Fieldcraft,
Fortification and Navigation have dedicated icons: LEGACY's Navigation is
a flat deep-water tile, no icon. Engineering shows the Workshop it unlocks,
because the chibi Mountain carries its grass tile and reads as a map square
on a card.

**Portraits are dedicated rasters, not map-sprite crops.** The map units
are 56 x 80 to 88 x 104 and would shrink to about 0.6x (smoothed) in a
48 px train tile. The portraits are 48 x 48 head-and-shoulders busts of
the same designs (headgear, owner garment and signature item), so a tile
shows them 1:1 and a 72 px card 1.5x. The Catapult and both ships are shown
whole (a machine has no bust). A selected unit on the map keeps its map
sprite in the dock, as in LEGACY. The embarked transport has no portrait:
nothing recruits it.

**Vector graphics stay vector (flag 11).** The HUD and dock glyphs
(`ui-icons-v7.ts`) and the tactical status symbols, including the
achievement entitlement symbols and the Field Defense command symbol,
follow the theme and high contrast and read cleanly beside the chibi art,
so batch 5 keeps them. The achievement notice keeps its trophy glyph and
the Build Monument commands show the chibi Monument. The End Turn button is
text, so it has no icon.

## Legacy IDs not reachable in Ruleset 7

These appear only in the painted-bounds table of
[`selection-identity-v7.ts`](../../src/render/dom/selection-identity-v7.ts)
or in superseded revision tables. Nothing in Ruleset 7 draws them, so no
batch replaces them: `unit-original-scout`, `-medic`, `-breacher`, `-heavy`,
`-saboteur`, `-horse-archer`, `unit-original-captain` (revision 9),
`portrait-original-captain` (revision 9), `building-ruleset7-port`,
`building-ruleset7-lumber-camp`, `building-square-grand-works`,
`terrain-ruleset7-resource-fish`, `terrain-square-fertile-ground`.

## Faction city sets (beads `pulp_wars-6gd.6` and `pulp_wars-c87.7`)

The Human `CITY:1`–`CITY:3` rasters are the only city variants: the capital
crown, the City Wall (fortification) badge, the population pips, the HP bar
and the garrisoned unit are code-drawn overlays shared by every faction. The
Undead, the Goblins and the Dinosaurs each have the same three rasters, on the Human
canvases, anchors and overflow, with owner masks. `SITE:VILLAGE` stays
shared.

| Art subject       | Asset                   | Batch             | Canvas   | Anchor  | Overflow side / up | Mask     | Look                             |
| ----------------- | ----------------------- | ----------------- | -------- | ------- | ------------------ | -------- | -------------------------------- |
| `CITY:UNDEAD:1`   | `chibi-undead-city-1`   | `cities-undead`   | 88 x 96  | default | 4 / 16             | required | [UNDEAD](factions/UNDEAD.md)     |
| `CITY:UNDEAD:2`   | `chibi-undead-city-2`   | `cities-undead`   | 96 x 100 | default | 8 / 20             | required | necropolis                       |
| `CITY:UNDEAD:3`   | `chibi-undead-city-3`   | `cities-undead`   | 96 x 104 | default | 8 / 24             | required | necropolis                       |
| `CITY:GOBLIN:1`   | `chibi-goblin-city-1`   | `cities-goblin`   | 88 x 96  | default | 4 / 16             | required | [GOBLIN](factions/GOBLIN.md)     |
| `CITY:GOBLIN:2`   | `chibi-goblin-city-2`   | `cities-goblin`   | 96 x 100 | default | 8 / 20             | required | scrap camp                       |
| `CITY:GOBLIN:3`   | `chibi-goblin-city-3`   | `cities-goblin`   | 96 x 104 | default | 8 / 24             | required | scrap camp                       |
| `CITY:DINOSAUR:1` | `chibi-dinosaur-city-1` | `cities-dinosaur` | 88 x 96  | default | 4 / 16             | required | [DINOSAUR](factions/DINOSAUR.md) |
| `CITY:DINOSAUR:2` | `chibi-dinosaur-city-2` | `cities-dinosaur` | 96 x 100 | default | 8 / 20             | required | bone-and-hide camp               |
| `CITY:DINOSAUR:3` | `chibi-dinosaur-city-3` | `cities-dinosaur` | 96 x 104 | default | 8 / 24             | required | bone-and-hide camp               |

The board and the selection dock resolve a city by its **owner's** faction
(`cityArtSubjectV7` in
[`chibi-art-v7.ts`](../../src/assets/chibi-art-v7.ts)), and a faction subject
without a usable raster falls back to the Human `CITY:<level>`
(`chibiFallbackSubjectV7`), like `UNIT:<FACTION>:<ROLE>`. The LEGACY art set
keeps `building-city-<level>` for every faction. Review evidence:
`npm run art:chibi-faction-cities-review`
([pipeline](CHIBI_PIPELINE.md#review-evidence)).

**Undead direction cities (bead `pulp_wars-3tq.12`).** The default look
draws these instead of the three `cities-undead` rasters, which remain for
the Classic look and as the fallback. They have no mask (`fixedColours`);
the owner is shown by a code-drawn pennant at the asset's entry in
`DIRECTION_FLAG_ANCHORS_V7`.

| Art subject     | Asset                           | Batch              | Canvas  | Anchor  | Overflow side / up | Mask | Pennant anchor (x, y, pole) |
| --------------- | ------------------------------- | ------------------ | ------- | ------- | ------------------ | ---- | --------------------------- |
| `CITY:UNDEAD:1` | `chibi-direction-undead-city-1` | `direction-undead` | 80 x 80 | default | 0 / 0              | none | 39.5, 0, 5                  |
| `CITY:UNDEAD:2` | `chibi-direction-undead-city-2` | `direction-undead` | 88 x 88 | default | 4 / 8              | none | 44.5, 0, 6                  |
| `CITY:UNDEAD:3` | `chibi-direction-undead-city-3` | `direction-undead` | 96 x 88 | default | 8 / 8              | none | 44.5, 6, 11                 |

**Dinosaur direction cities (bead `pulp_wars-3tq.13`).** The default look
draws these instead of the three `cities-dinosaur` rasters, which remain
for the Classic look and as the fallback. They are edits of the classic
camps on the same canvases, with no mask (`fixedColours`); the owner is
shown by a code-drawn pennant at the asset's entry in
`DIRECTION_FLAG_ANCHORS_V7`.

| Art subject       | Asset                             | Batch                | Canvas   | Anchor  | Overflow side / up | Mask | Pennant anchor (x, y, pole) |
| ----------------- | --------------------------------- | -------------------- | -------- | ------- | ------------------ | ---- | --------------------------- |
| `CITY:DINOSAUR:1` | `chibi-direction-dinosaur-city-1` | `direction-dinosaur` | 88 x 96  | default | 4 / 16             | none | 30.5, 0, 6                  |
| `CITY:DINOSAUR:2` | `chibi-direction-dinosaur-city-2` | `direction-dinosaur` | 96 x 100 | default | 8 / 20             | none | 66.5, 11, 0                 |
| `CITY:DINOSAUR:3` | `chibi-direction-dinosaur-city-3` | `direction-dinosaur` | 96 x 104 | default | 8 / 24             | none | 68.5, 0, 12                 |

## New visual direction: batch `direction-human` (bead `pulp_wars-3tq.5`)

Production art of the [new direction](VISUAL_DIRECTION_2026-10.md#12-production).
The subjects are the ones above; the rasters are registered in
[`src/assets/chibi-direction-art-manifest.ts`](../../src/assets/chibi-direction-art-manifest.ts),
a list separate from the default manifest, so the default rendering does not
change until bead `pulp_wars-3tq.6`. None has an owner mask.

| Subject                                                                                 | Asset id                          | Canvas   | Class           | Notes                                                           |
| --------------------------------------------------------------------------------------- | --------------------------------- | -------- | --------------- | --------------------------------------------------------------- |
| `UNIT:FIGHTER`, `MARKSMAN`, `GUARD`, `CAPTAIN`                                          | `chibi-direction-<role>`          | 56 x 80  | `STANDARD_UNIT` | edits of the accepted sprites; `fixedColours`                   |
| `UNIT:RAIDER`, `KNIGHT`, `CATAPULT`                                                     | `chibi-direction-<role>`          | 72 x 88  | `LARGE_UNIT`    | as above                                                        |
| `UNIT:JUGGERNAUT`                                                                       | `chibi-direction-juggernaut`      | 88 x 104 | `GIANT_UNIT`    | as above                                                        |
| `PORTRAIT:<ROLE>` (the 8 land roles)                                                    | `chibi-direction-portrait-<role>` | 48 x 48  | `PORTRAIT`      | edits of the batch-5 portraits; `fixedColours`                  |
| `IMPROVEMENT:FARM`                                                                      | `chibi-direction-farm`            | 80 x 80  | `BUILDING`      | three beds of mixed vegetables; seamless, a gap on the centre   |
| `IMPROVEMENT:WINDMILL`                                                                  | `chibi-direction-windmill`        | 64 x 72  | `BUILDING`      | calm style, seated                                              |
| `IMPROVEMENT:LUMBER_CAMP`, `SAWMILL`, `FORGE`, `WORKSHOP`, `MARKET`, `PORT`, `SHIPYARD` | `chibi-direction-<name>`          | 72 x 72  | `BUILDING`      | calm style, seated; Port and Shipyard fly a code-drawn pennant  |
| `IMPROVEMENT:MONUMENT`                                                                  | `chibi-direction-monument`        | 48 x 72  | `BUILDING`      | calm style, seated                                              |
| `CITY:1`                                                                                | `chibi-direction-city-1`          | 80 x 80  | `SETTLEMENT`    | generated at 96 x 96, seated; pennant anchor (40, 7), pole 12   |
| `CITY:2`                                                                                | `chibi-direction-city-2`          | 88 x 80  | `SETTLEMENT`    | pennant anchor (43.5, 0), pole 6                                |
| `CITY:3`                                                                                | `chibi-direction-city-3`          | 96 x 88  | `SETTLEMENT`    | 8 px side and upward overflow; pennant anchor (48.5, 9), pole 7 |
| `SITE:VILLAGE`                                                                          | `chibi-direction-village`         | 72 x 72  | `SETTLEMENT`    | neutral; no pennant                                             |

Every improvement and city uses the class placement (bottom-centred), so the
canvas bottom is the cell bottom and the art stands 3 px above it. The city
canvases differ from today's (88 x 96, 96 x 100, 96 x 104): the new cities
stay inside their cell, so a unit to the north keeps its base plate. Pennant
anchors are master pixels from the top-left corner
(`DIRECTION_FLAG_ANCHORS_V7`; Port (49.5, 22) on its own mast, Shipyard
(21, 4) with an 11 px pole).

**Not in the batch:** the Patrol Boat, the Battleship and the embarked
transport (shared by every faction; unchanged), the Mine (part of the Mined
Mountain terrain art; toned by code with the terrain), terrain, resources,
and everything Undead, Goblin and Dinosaur (each has a batch of its own:
`direction-goblin` below, `direction-undead` and `direction-dinosaur`
above).

## New visual direction: batch `direction-goblin` (bead `pulp_wars-3tq.9`)

Production art of the Goblin faction in the
[new direction](VISUAL_DIRECTION_2026-10.md#16-goblin-production), live in
the default look. The subjects are the Goblin faction subjects above; the
rasters are registered in `CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7` of
[`src/assets/chibi-direction-art-manifest.ts`](../../src/assets/chibi-direction-art-manifest.ts)
and resolved before the classic Goblin art. None has an owner mask; every
one is an edit of the classic sprite, on the same canvas, anchor and
overflow.

| Subject                                     | Asset id                                                       | Canvas   | Class           | Notes                                                     |
| ------------------------------------------- | -------------------------------------------------------------- | -------- | --------------- | --------------------------------------------------------- |
| `UNIT:GOBLIN:FIGHTER`, `MARKSMAN`, `GUARD`  | `chibi-direction-goblin-goblin`, `-bomb-chucker`, `-orc-brute` | 56 x 80  | `STANDARD_UNIT` | default anchor; `fixedColours`                            |
| `UNIT:GOBLIN:CAPTAIN`                       | `chibi-direction-goblin-orc-warboss`                           | 56 x 80  | `STANDARD_UNIT` | anchor (27, 40), as the classic Warboss                   |
| `UNIT:GOBLIN:RAIDER`                        | `chibi-direction-goblin-wolf-rider`                            | 72 x 88  | `LARGE_UNIT`    | default anchor                                            |
| `UNIT:GOBLIN:CATAPULT`                      | `chibi-direction-goblin-rocket-cart`                           | 72 x 88  | `LARGE_UNIT`    | the fireworks cart; anchor (34, 48)                       |
| `UNIT:GOBLIN:KNIGHT`                        | `chibi-direction-goblin-scrap-buggy`                           | 72 x 88  | `LARGE_UNIT`    | anchor (32, 48)                                           |
| `UNIT:GOBLIN:JUGGERNAUT`                    | `chibi-direction-goblin-troll`                                 | 88 x 104 | `GIANT_UNIT`    | default anchor                                            |
| `PORTRAIT:GOBLIN:<ROLE>` (the 8 land roles) | `chibi-direction-portrait-goblin-<name>`                       | 48 x 48  | `PORTRAIT`      | edits of the batch `5-goblin` busts; the cart whole       |
| `CITY:GOBLIN:1`                             | `chibi-direction-goblin-city-1`                                | 88 x 96  | `SETTLEMENT`    | pennant anchor (62, 10), beside the lookout pole's knob   |
| `CITY:GOBLIN:2`                             | `chibi-direction-goblin-city-2`                                | 96 x 100 | `SETTLEMENT`    | pennant anchor (48.5, 0), a 6 px pole on the tower's stub |
| `CITY:GOBLIN:3`                             | `chibi-direction-goblin-city-3`                                | 96 x 104 | `SETTLEMENT`    | pennant anchor (50, 5), beside the big tent's pole        |

Unlike the Human cities of batch `direction-human`, the Goblin cities keep
the classic canvases and their upward overflow (16 to 24 px), so a pennant
flies in the cell to the north. **Not in the batch:** the Kaboom! and
WAAAGH! icons (batch `5-goblin`, unchanged) and the shared ships.

## Counts per batch

| Batch              | Map subjects                                                                                           | Minimum rasters (with the variants above)                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1                  | Grass, Forest, Mountain, Shallow and Deep Water, Village, City 1–3, Fighter, Marksman                  | about 19: 3 grass, 2–3 forest, 2–3 mountain, 2 + 2 water, 4 settlements, 2 units                                                                      |
| 2                  | Raider, Guard, Captain, Catapult, Knight, Juggernaut                                                   | 6                                                                                                                                                     |
| 3                  | 6 resources, Treasure, Farm, Lumber Camp, Port, Monument, Mined Mountain; Roads and Field Defense      | about 17 plus 2–3 mined mountains; Roads and Field Defense need a decision first                                                                      |
| 4                  | Windmill, Sawmill, Forge, Workshop, Market, Shipyard, Patrol Boat, Battleship, Embarked form           | 9                                                                                                                                                     |
| 5                  | portraits, 23 technology icons, action, reward and HUD art                                             | 8 portraits, 3 dedicated technology icons plus 5 reused portraits or actions, 13 action icons, 3 reward icons, 2 HUD icons; vector glyphs by decision |
| `direction-human`  | the 8 Human land units and their portraits, the 10 improvements, City 1–3, the Village (new direction) | 30                                                                                                                                                    |
| `direction-goblin` | the 8 Goblin land units and their portraits, Goblin City 1–3 (new direction)                           | 19                                                                                                                                                    |

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
   piece overlays so no tall piece hides it. Roads under tall terrain
   (bead `pulp_wars-yyy`): a Road or corner join on a Forest, Mountain or
   Mine passes under the tree or rock body, as in legacy. Each tall-terrain
   master is registered with its two pipeline layers (`layers`: the
   transparent body `<id>.body.png`, which is the accepted candidate, and
   the `chibi-grass-1` ground). Such a cell draws the ground tile in the
   ground pass, then Roads, then the body's owning cell before any piece,
   and keeps the master's upward overflow in the foreground pass. Cells
   without a Road, and any cell whose layers are still loading, draw the
   whole master as before.
2. **Farm pairs.** Legacy Farms join into horizontal and vertical two-tile
   fields. Chibi has one `IMPROVEMENT:FARM` subject and no pair logic, so a
   chibi Farm is a single-tile building unless the runtime gains pair
   subjects. **Batch 3 decision:** one single-cell Farm (a barn with a
   haystack and wheat) is drawn for every Farm cell, paired or not; the
   CHIBI path ignores the legacy pair crop, so a pair reads as two
   neighbouring farmsteads. **Bead `pulp_wars-6gd.5`:** the user asked for
   "a field of grain ... without the house" and without faction colours.
   The Farm is now one wheat patch per cell, almost as wide and as tall as
   the tile, with no owner mask; it is still drawn once per Farm cell with
   no pair logic, and neighbouring Farms read as one field.
3. **Tall-terrain ground.** Chibi Forest and Mountain masters contain their
   own 80 x 80 ground cell (the runtime draws the cell during the ground
   pass). The pipeline composes them over an accepted ground tile. Legacy
   mountains stand on gravel, but no gravel subject exists; batch 1 must
   choose the ground for mountains (grass, or a pipeline-only gravel tile
   that is never registered as a subject). **Batch 1 decision:** grass.
   Every Forest and Mountain composites over `chibi-grass-1`, so tall
   terrain joins the surrounding meadow without a seam; the Mined Mountain
   (batch 3) should do the same. **Bead `pulp_wars-6gd.5`:** the user found
   that mountains "look a bit too much like just a single rock formation
   sticking out the grass" and asked for a rocky background. Mountains and
   Mined Mountains now composite over `chibi-mountain-ground-1`, the
   pipeline-only rocky tile this flag foresaw (light slate rock with small
   boulders, pebbles and cracks, a forced three-colour palette); Forests
   keep the grass. The same accepted bodies were re-composited, so the
   peaks, Ore and Mine entrances are unchanged. A Mountain tile is now a
   grey square beside grass, with a straight edge like water. **Bead
   `pulp_wars-6gd.7`:** that straight edge made a lone Mountain read as a
   grey box, so the runtime now cuts the rocky ground back to a ragged
   edge wherever a Mountain borders other land (see
   [the pipeline's runtime ground fringe](CHIBI_PIPELINE.md#runtime-ground-fringe)).
   Edges between Mountains, and against water, fog and the board edge,
   stay straight. No asset changed.
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
   of opaque pixels). (Since bead `pulp_wars-6gd.5` the Farm is a field of
   grain with no building and no mask.) Resources, Treasure and the Mine are unowned map
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
   show both styles side by side. **Batch 5 decision:** a DOM art-set hook
   with the canvas's per-subject fallback, faction awareness and owner
   recolour ([Batch 5](#batch-5-the-interface-in-chibi)).
10. **Ships have no portraits.** Patrol Boat and Battleship use their map
    sprites as portraits; batch 5 should add portraits or keep that reuse on
    purpose. **Batch 5 decision:** dedicated 48 x 48 portraits of the whole
    ship, because the map ships shrink to half size in a 48 px train tile.
11. **HUD glyphs and tactical symbols are vector.** They already follow the
    theme and high contrast. Batch 5 should decide with the user whether they
    stay vector (recommended) or become pixel art. **Batch 5 decision:** they
    stay vector (the recommendation), pending the batch-5 user review.
12. **The tile-80 Fighter and Marksman fail the strict mask QA.** Their
    shields, boots and bows are red-brown. Batch 1 must regenerate them with
    "browns that are clearly not red" rather than reuse them.

## Martian production art: batch `direction-martian` (bead `pulp_wars-t6s.6`)

A fifth faction's art, made before the faction is in the game and **not
registered**: the entries are in
[`chibi-direction-martian-art-manifest.ts`](../../src/assets/chibi-direction-martian-art-manifest.ts),
which nothing imports until bead `pulp_wars-t6s.4`. Fixed faction colours
(chrome, gunmetal, glass, lavender-grey skin, one hot magenta accent), no
owner mask. See [MARTIAN.md](factions/MARTIAN.md).

| Subjects                                                                                            | Assets                                     | Class and canvas                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| `UNIT:MARTIAN:FIGHTER`, `MARKSMAN`, `GUARD`, `CAPTAIN`                                              | Grunt, Ray Gunner, Shield Projector, Brain | `STANDARD_UNIT`, 56 x 80                                          |
| `UNIT:MARTIAN:RAIDER`, `CATAPULT`, `KNIGHT`                                                         | Saucer, Tripod, Mothership                 | `LARGE_UNIT`, 72 x 88                                             |
| `UNIT:MARTIAN:JUGGERNAUT`                                                                           | Colossus                                   | `GIANT_UNIT`, 88 x 104                                            |
| `UNIT:MARTIAN:THRALL`                                                                               | Thrall (a controlled unit of any faction)  | `STANDARD_UNIT`, 56 x 80                                          |
| `PORTRAIT:MARTIAN:<ROLE>`, `PORTRAIT:MARTIAN:THRALL`                                                | nine portraits                             | `PORTRAIT`, 48 x 48                                               |
| `CITY:MARTIAN:1` to `3`                                                                             | the landed-saucer colony                   | `SETTLEMENT`, 80 x 80, 88 x 88, 96 x 88; pennant anchors recorded |
| `ICON:ACTION:BEAM_DOWN`, `MIND_CONTROL`, `TRACTOR_BEAM`, `FORCE_FIELD`, `ICON:ACTION:MARTIAN:RALLY` | five command and ability icons             | `ICON`, 48 x 48                                                   |
| `ICON:STATUS:SHIELD`, `ICON:STATUS:COOLING`                                                         | two status icons                           | `ICON`, 48 x 48                                                   |
| `EFFECT:HEAT_RAY`, `SHIELD_FLARE`, `BEAM_DOWN`, `TRACTOR_BEAM`, `MIND_CONTROL`                      | five effect sprites                        | `EFFECT`, 48 x 48 (the spiral 40 x 40), palette `martian-magenta` |

33 assets from 62 recipes (62 PixelLab calls). Patrol Boat, Battleship and
the embarked transport stay the shared ships. The Shield bar, the Cooling
glyph, the Thrall collar, the flyers' shadow and the beams are code-drawn
by the UI bead; their colours and shapes are suggested in
[MARTIAN.md](factions/MARTIAN.md#suggestions-for-the-code-drawn-markers).

## Ice Folk production art: batch `direction-ice-folk` (bead `pulp_wars-7g3.5`)

A sixth faction's art, made before the faction is in the game and **not
registered**: the entries are in
[`chibi-direction-ice-folk-art-manifest.ts`](../../src/assets/chibi-direction-ice-folk-art-manifest.ts),
which nothing imports until bead `pulp_wars-7g3.6` (the review scenes
excepted). Fixed faction colours ("frost and fur": warm white and cream fur
shaded taupe, charcoal slate faces, dark brown-grey hide, ivory bone, one
deep ice-blue accent), no owner mask. See [ICE_FOLK.md](factions/ICE_FOLK.md).

| Subjects                                                                        | Assets                                  | Class and canvas                                                      |
| ------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `UNIT:ICE_FOLK:FIGHTER`, `MARKSMAN`, `GUARD`, `CAPTAIN`                         | Yeti, Snow Hunter, Mammoth, Ice Witch   | `STANDARD_UNIT`, 56 x 80                                              |
| `UNIT:ICE_FOLK:RAIDER`, `CATAPULT`, `KNIGHT`                                    | Sled, Boulder Yeti, Sabretooth          | `LARGE_UNIT`, 72 x 88                                                 |
| `UNIT:ICE_FOLK:JUGGERNAUT`                                                      | Frost Giant                             | `GIANT_UNIT`, 88 x 104                                                |
| `PORTRAIT:ICE_FOLK:<ROLE>`                                                      | eight portraits                         | `PORTRAIT`, 48 x 48                                                   |
| `CITY:ICE_FOLK:1` to `3`                                                        | the igloo settlement                    | `SETTLEMENT`, 80 x 80, 88 x 88, 96 x 88; pennant anchors recorded     |
| `ICON:ACTION:THROW_BOLAS`, `COLD_SNAP`, `SHATTER`, `SWEEP`, `ROCKFALL`, `PROWL` | six command and ability icons           | `ICON`, 48 x 48                                                       |
| `ICON:TECH:ICE_FOLK:FORTIFICATION`, `ICON:TECH:ICE_FOLK:EXPLOSIVES`             | Deep Winter and Brittle                 | `ICON`, 48 x 48                                                       |
| `ICON:STATUS:CHILLED`, `ICON:STATUS:FROZEN`                                     | the Frosted glyph and the Frozen status | `ICON`, 48 x 48                                                       |
| `EFFECT:SHATTER`, `SHATTER_SHARDS`, `COLD_SNAP`, `BOLAS`, `FROST_HIT`           | five effect sprites                     | `EFFECT`, 48 x 48 (Bolas and frost 40 x 40), palette `ice-folk-frost` |

34 assets from 72 recipes (72 PixelLab calls). Patrol Boat, Battleship and
the embarked transport stay the shared ships. The Snow overlay, the
Blizzard, the Frozen and Frosted markers and the Shatter window on the HP
bar are code-drawn; their pure drawing functions and colours are in
[`chibi-direction-ice-folk-presentation.ts`](../../src/assets/chibi-direction-ice-folk-presentation.ts)
and described in [ICE_FOLK.md](factions/ICE_FOLK.md#code-drawn-pieces).
