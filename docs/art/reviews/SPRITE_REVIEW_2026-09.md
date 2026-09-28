# Sprite review, September 2026: current Ruleset 7 art at play scale

**Status:** independent critical review for bead `pulp_wars-73l.1`. It
describes the production sprites that the current Ruleset 7 runtime
(`pulp-wars-poc-7r12`) draws, judged as a player sees them. It changes no
asset, manifest, registry, or runtime code. It feeds the art-style exploration
in `pulp_wars-73l.2`.

**Evidence:** every image referenced below is in
[`art/reviews/sprite-review-2026-09/`](../../../art/reviews/sprite-review-2026-09/).
[How the evidence was produced](#how-the-evidence-was-produced) explains the
method. The reviewer looked at every evidence image, at native size and
enlarged.

## Summary

The current sprites are charming close up and share a friendly, non-gritty
tone. At the zoom players actually use, however, they fail the art direction's
first principle, "readability at gameplay scale over detail". The five most
important problems are:

1. On standard boards, the default camera is the minimum zoom (0.625x). At
   that zoom a standard unit is about 25–35 CSS px wide, and five of the eight
   land roles become the same tan blob.
2. Sprites do not show who owns them. Ownership depends on an 11–18 px badge
   whose seat number is covered by the health bar. The ships, Port and
   Shipyard all have a baked coral patch that is never recolored, so a Teal
   battleship looks like a Coral one.
3. The scale hierarchy is flat or inverted. Resources are as large as units,
   the Knight is as large as the Juggernaut, and a neutral Village is as large
   as a level-1 city.
4. The style is a patchwork of generation batches. Downsampled detailed pixel
   art sits beside soft-painted ground, vector-sticker resources,
   isometric diamond-era settlements, and top-down Farms with diagonal
   furrows. Display scales range from 0.24 to 0.6.
5. Tiles clash with each other. The orange Farm squares and the blue-grey
   Mountain squares ignore the grid's visual rhythm, and tall Forests hide the
   content of the tile above.

## Inventory reviewed

The runtime mapping is in
[`src/assets/ruleset7-ui-art.ts`](../../../src/assets/ruleset7-ui-art.ts) and
[`src/render/canvas/board-renderer-v7.ts`](../../../src/render/canvas/board-renderer-v7.ts).
Files are resolved through
[`src/assets/generated-art-manifest.ts`](../../../src/assets/generated-art-manifest.ts).
Visible sizes are the non-transparent bounds multiplied by the renderer's
display scale ([`board-art-geometry.ts`](../../../src/render/canvas/board-art-geometry.ts)).
A tile is 128 CSS px at 1x.

| Role / object      | Asset ID                                                                                                                                              | File (under `public/assets/pixellab/`)                | Scale | Visible @1x (CSS px) | @0.625  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----: | -------------------- | ------- |
| Fighter            | `unit-original-fighter`                                                                                                                               | `units/warrior.png`                                   |  0.25 | 54 x 59              | 34 x 37 |
| Raider             | `unit-original-raider`                                                                                                                                | `units/rider.png`                                     |  0.25 | 44 x 58              | 28 x 36 |
| Marksman           | `unit-original-marksman`                                                                                                                              | `units/archer.png`                                    |  0.25 | 40 x 57              | 25 x 35 |
| Guard              | `unit-original-guard`                                                                                                                                 | `units/defender.png`                                  |  0.25 | 56 x 55              | 35 x 34 |
| Captain            | `unit-original-captain-v7r10`                                                                                                                         | `units/original-captain-v7r10.png`                    | 0.275 | 55 x 59              | 34 x 37 |
| Catapult           | `unit-original-catapult`                                                                                                                              | `units/original-catapult.png`                         |  0.24 | 57 x 54              | 36 x 34 |
| Knight             | `unit-original-knight`                                                                                                                                | `units/original-knight-v7r9.png`                      |  0.27 | 82 x 73              | 51 x 46 |
| Juggernaut         | `unit-original-juggernaut`                                                                                                                            | `units/original-juggernaut.png`                       |  0.25 | 82 x 78              | 51 x 49 |
| Patrol Boat        | `unit-original-patrol-boat`                                                                                                                           | `units/original-patrol-boat.png`                      |  0.24 | 63 x 42              | 39 x 26 |
| Battleship         | `unit-original-battleship`                                                                                                                            | `units/original-battleship.png`                       |  0.27 | 87 x 56              | 55 x 35 |
| Embarked (any)     | `unit-shared-embarked-transport`                                                                                                                      | `units/shared-embarked-transport.png`                 |  0.24 | 62 x 39              | 39 x 25 |
| Village            | `building-village`                                                                                                                                    | `buildings/village.png`                               |  0.50 | 89 x 94              | 55 x 59 |
| City level 1       | `building-city-1`                                                                                                                                     | `buildings/city-1.png`                                |  0.30 | 101 x 86             | 63 x 54 |
| City level 2       | `building-city-2`                                                                                                                                     | `buildings/city-2.png`                                |  0.30 | 107 x 101            | 67 x 63 |
| City level 3+      | `building-city-3`                                                                                                                                     | `buildings/city-3.png`                                |  0.30 | 107 x 101            | 67 x 63 |
| Treasure           | `building-treasure-chest`                                                                                                                             | `buildings-square/treasure-chest.png`                 |  0.60 | 49 x 52              | 30 x 32 |
| Farm               | `building-ruleset7-farm-single` / `-pair-*`                                                                                                           | `buildings-ruleset7/farm-*.png`                       |  0.50 | full tile            | —       |
| Lumber Camp        | `building-ruleset7-resource-lumber-camp`                                                                                                              | `buildings-ruleset7/resource-lumber-camp.png`         |  0.36 | 98 x 98              | 61 x 61 |
| Mine               | `terrain-ruleset7-revision3-mined-mountain-1…3`                                                                                                       | `terrain-ruleset7/revision3-mined-mountain-*.png`     |  0.50 | full tile + peak     | —       |
| Windmill           | `building-square-windmill`                                                                                                                            | `buildings-square/windmill.png`                       |  0.30 | 59 x 85              | 37 x 53 |
| Sawmill            | `building-square-sawmill`                                                                                                                             | `buildings-square/sawmill.png`                        |  0.36 | 76 x 75              | 48 x 47 |
| Forge              | `building-square-forge`                                                                                                                               | `buildings-square/forge.png`                          |  0.30 | 61 x 68              | 38 x 43 |
| Workshop           | `building-square-workshop`                                                                                                                            | `buildings-square/workshop.png`                       |  0.30 | 56 x 64              | 35 x 40 |
| Market             | `building-square-market`                                                                                                                              | `buildings-square/market.png`                         |  0.30 | 61 x 67              | 38 x 42 |
| Monument           | `building-square-monument`                                                                                                                            | `buildings-square/monument.png`                       |  0.30 | 45 x 73              | 28 x 46 |
| Port               | `building-ruleset7-port-v7r11`                                                                                                                        | `buildings-ruleset7/port-v7r11.png`                   |  0.30 | 92 x 73              | 57 x 46 |
| Shipyard           | `building-ruleset7-shipyard`                                                                                                                          | `buildings-ruleset7/shipyard-v7r9.png`                |  0.30 | 91 x 79              | 57 x 49 |
| Fruit (3 variants) | `terrain-square-original-fruit`, `…-pear`, `…-plum`                                                                                                   | `terrain-square/*fruit*.png`                          |  0.50 | 52 x 42 (apple)      | 33 x 26 |
| Game (3 variants)  | `terrain-square-original-animal`, `…-deer`, `…-fox`                                                                                                   | `terrain-square/*animal*.png`, `*game-*.png`          |  0.50 | 60 x 52 (boar)       | 38 x 33 |
| Fertile Ground     | `terrain-ruleset7-resource-fertile-ground`                                                                                                            | `terrain-square/ruleset7-resource-fertile-ground.png` |  0.50 | 60 x 37              | 38 x 23 |
| Ore                | `terrain-square-ore`                                                                                                                                  | `terrain-square/ore.png`                              |  0.50 | 59 x 48              | 37 x 30 |
| Fish               | `terrain-ruleset7-resource-fish-v7r11`                                                                                                                | `terrain-ruleset7/resource-fish-v7r11.png`            |  0.50 | 80 x 58              | 50 x 36 |
| Pearls             | `terrain-ruleset7-resource-pearls`                                                                                                                    | `terrain-ruleset7/resource-pearls.png`                |  0.50 | 68 x 70              | 43 x 44 |
| Terrain            | `terrain-ruleset7-original-grass-1…3`, `-forest-1…4`, `terrain-ruleset7-revision3-mountain-1…3`, `-gravel`, `terrain-ruleset7-water-shallow`, `-deep` | `terrain-ruleset7/*.png`                              |  0.50 | full tile            | —       |

Portraits (`portrait-original-*`) are deterministic crops of the unit
sources. Technology and action art mixes dedicated `ui-*` icons with reused
world sprites. Field Defense, Roads, owner badges, health bars, population
pips and territory borders are drawn in code, not as sprites. They appear in
the evidence because they affect readability.

Sources: [units](../../../art/reviews/sprite-review-2026-09/01-units-source.png),
[buildings](../../../art/reviews/sprite-review-2026-09/02-buildings-source.png),
[terrain](../../../art/reviews/sprite-review-2026-09/03-terrain-source.png),
[resources](../../../art/reviews/sprite-review-2026-09/04-resources-source.png),
[portraits](../../../art/reviews/sprite-review-2026-09/05-portraits-source.png).

## Findings by severity

Severity reflects the effect on a player's ability to read the board:
**Critical** blocks core decisions, **High** regularly misleads or slows play,
**Medium** is noticeable friction or inconsistency, and **Low** is polish.

### Critical

#### C1. Land unit roles are unreadable at the zoom players actually use

- **Assets:** `unit-original-fighter`, `-raider`, `-marksman`, `-guard`,
  `-captain-v7r10`.
- **Evidence:**
  [natural game, round 15, fit zoom](../../../art/reviews/sprite-review-2026-09/40-natural-round15-fit-z0625-dpr1.png),
  [the same view at DPR 2](../../../art/reviews/sprite-review-2026-09/42-natural-round15-fit-z0625-dpr2-crop.png),
  [roster at 0.625x, enlarged 3x](../../../art/reviews/sprite-review-2026-09/14-roster-z0625-dpr1-coral-teal-enlarged3x.png),
  [unit silhouettes](../../../art/reviews/sprite-review-2026-09/50-unit-silhouettes-1x-0625x.png).
- On an 11 x 11 board in a 1440 x 900 window, `fitCamera` already chooses
  about 0.625x (80 px tiles). The minimum zoom is therefore the default view,
  not an edge case.
- At 0.625x, standard units are 25–35 CSS px wide and 34–37 px tall.
  Fighter, Marksman, Guard, Captain and Raider share the same body, tan
  tunic, white scarf, teal trim and face. Only a thin prop tells them apart:
  sword, bow, oval shield, bicorne, or a small grey mount.
- In the black-silhouette test, only the Knight, Catapult, Juggernaut and
  Battleship are distinct at 0.625x. The Marksman's bow shrinks to a 1–2 px
  arc. The Raider's mount reads as a lump under the rider, not as an animal.
- This contradicts [ART_DIRECTION](../ART_DIRECTION.md#core-principles):
  "every unit should be identifiable primarily from its silhouette". It also
  contradicts the [unit class](../classes/units.md#pose-and-silhouettes) rule
  that a Rider's mount must read at crop scale.

#### C2. Ownership is not readable from sprites, and naval art shows the wrong owner

- **Assets:** every unit and city (no owner area on the sprite);
  `unit-original-patrol-boat`, `unit-original-battleship`,
  `unit-shared-embarked-transport`, `building-ruleset7-port-v7r11`,
  `building-ruleset7-shipyard` (baked coral panel).
- **Evidence:**
  [roster forest, mountain and water rows, enlarged](../../../art/reviews/sprite-review-2026-09/15-roster-z0625-dpr1-forest-mountain-water-enlarged3x.png),
  [roster at 1x, DPR 2](../../../art/reviews/sprite-review-2026-09/11-roster-z1-dpr2.png),
  [settlement at 1x](../../../art/reviews/sprite-review-2026-09/20-settlement-z1-dpr1.png).
- Land units and cities carry no owner color. Coral, Teal, Gold and Violet
  Fighters are identical except for the renderer badge.
- That badge is an 18 px square at 1x and an 11 px square at 0.625x. The
  health bar is drawn after it, so the bar covers the seat number.
- The three naval sprites, the Port and the Shipyard have a salmon/coral panel
  on the hull or warehouse. The [naval class](../classes/naval.md) calls it a
  maskable faction-color patch, but the renderer never recolors it. Teal,
  Gold and Violet ships and every enemy Port therefore show a Coral stripe,
  which is a misleading owner cue.
- The [unit class](../classes/units.md#line-palette-and-shading) requires a
  contiguous 8–15% maskable faction patch on units. None of the land sprites
  have one.

### High

#### H1. The scale hierarchy is flat or inverted

- **Evidence:**
  [settlement at 1x](../../../art/reviews/sprite-review-2026-09/20-settlement-z1-dpr1.png),
  [settlement at 0.625x](../../../art/reviews/sprite-review-2026-09/22-settlement-z0625-dpr1.png),
  [natural game crop](../../../art/reviews/sprite-review-2026-09/42-natural-round15-fit-z0625-dpr2-crop.png),
  [building silhouettes](../../../art/reviews/sprite-review-2026-09/51-building-silhouettes-1x-0625x.png),
  and the size table above.
- **Resources rival units.** `terrain-ruleset7-resource-pearls` (68 x 70),
  `…fish-v7r11` (80 x 58) and the boar `terrain-square-original-animal`
  (60 x 52) are as large as or larger than a Fighter (54 x 59). Their colors
  are more saturated (red apples, pink clam, orange fox), so resources pull
  the eye before units do. This inverts the direction that terrain should be
  "simpler and quieter than the units".
- **The Knight is as large as the Juggernaut.** `unit-original-knight`
  (82 x 73) nearly matches the 40 HP giant `unit-original-juggernaut`
  (82 x 78), so the giant is not systematically larger.
- **The Village is as large as a city.** `building-village` (89 x 94 at scale
  0.5) matches `building-city-1` (101 x 86 at scale 0.3). Its heavier line
  weight makes it look more substantial. In the natural game, two Villages
  read as bigger than the player's own level-2 capital. This contradicts
  [buildings.md](../classes/buildings.md), which requires the neutral Village
  to be visibly smaller than a level-1 city.
- **A unit in a city covers the city.** A unit standing on its capital covers
  most of the city sprite, and at 0.625x the city is reduced to a few domes
  behind the unit. The class requires a city to stay identifiable under an
  occupant.

#### H2. Style is inconsistent across classes, batches and eras

- **Evidence:**
  [source pixel detail](../../../art/reviews/sprite-review-2026-09/52-source-pixel-detail-2x-nearest.png),
  [units](../../../art/reviews/sprite-review-2026-09/01-units-source.png),
  [buildings](../../../art/reviews/sprite-review-2026-09/02-buildings-source.png),
  [resources](../../../art/reviews/sprite-review-2026-09/04-resources-source.png),
  [terrain](../../../art/reviews/sprite-review-2026-09/03-terrain-source.png).
- **Rendering technique varies by class:**
  - Units, cities and processors are detailed pixel art with hard pixel
    steps, tunic stitching, belt buckles, eye highlights and brick courses.
    That is the "detailed pixel art" the direction rules out, and it becomes
    mush when downsampled at 0.25.
  - Grass is soft, painterly mottling with no outlines.
  - Resources (fox, deer, fish, fruit) are clean vector-sticker illustrations
    with thinner, smoother outlines.
  - Settlements (`building-city-*`, `building-village`) are diamond-era
    isometric pieces placed on square cells.
  - Farms (`building-ruleset7-farm-*`) are flat top-down squares with diagonal
    furrows.
- **Line weight varies.** Display scales run from 0.24 (Catapult, boats) to
  0.6 (treasure chest), so on screen the same source outline ranges from about
  1 to about 2.5 CSS px. The chest and Village look heavy and the units look
  thin.
- **Generation batches show.** The Fighter, Raider, Marksman and Guard are the
  oldest rasters, reused from the earlier Warrior/Rider/Archer/Defender
  files. The Knight (revision 9) has a realistically proportioned horse and a
  rider with a tiny head, unlike the chunky big-head units. The Captain
  (revision 10) is broader and more detailed.
- **Eras are mixed inside one faction.** Medieval tunics, a Knight and a
  Catapult sit beside a Napoleonic bicorne Captain and 20th-century grey steel
  gunboats with turrets and bridge windows. The direction allows genres to
  differ between factions, but the one Original faction has no coherent
  gimmick.
- These choices break several items of the direction's
  [consistency rule](../ART_DIRECTION.md#consistency-rule): sprite scale,
  outline thickness, body proportions, level of detail, and faction visual
  language.

#### H3. Tiles clash and tall terrain hides content

- **Evidence:**
  [settlement at 1x](../../../art/reviews/sprite-review-2026-09/20-settlement-z1-dpr1.png),
  [Coral capital, DPR 2](../../../art/reviews/sprite-review-2026-09/24-settlement-coral-capital-z1-dpr2-crop.png),
  [resources at 1x](../../../art/reviews/sprite-review-2026-09/30-resources-z1-dpr1.png),
  [forest and mountain rows](../../../art/reviews/sprite-review-2026-09/15-roster-z0625-dpr1-forest-mountain-water-enlarged3x.png).
- **Farms.** `building-ruleset7-farm-*` paint the full square in saturated
  orange-brown with 45° furrows and heavy dark shadows. They are the loudest
  thing on the board at every zoom, and the diagonal rows fight the square
  grid.
- **Mountains.** `terrain-ruleset7-revision3-mountain-*`, `-gravel` and the
  mined variants sit on hard-edged blue-grey squares with no transition to
  neighbouring grass, so mixed terrain reads as a patchwork quilt.
- **Forests.** The canopies of `terrain-ruleset7-original-forest-2/3/4` rise
  into the row above. In the resources scene they fully hide the Fertile
  Ground on the tile above.
- **Units on Forest and Mountain.** Units there sit inside a tangle of glossy
  tree crowns or in front of a peak of the same value. The unit silhouette
  loses contrast exactly where cover matters tactically.

### Medium

#### M1. Several building silhouettes are too similar

- **Evidence:**
  [building silhouettes](../../../art/reviews/sprite-review-2026-09/51-building-silhouettes-1x-0625x.png),
  [buildings](../../../art/reviews/sprite-review-2026-09/02-buildings-source.png).
- **City levels 2 and 3.** `building-city-2` and `building-city-3` differ
  only by one extra tower on the left. Their silhouettes are almost
  identical, and level 3 is the art for every level from 3 up.
- **Small processors.** `building-square-workshop` is a plain cube, and
  Forge, Workshop and Market are all boxy stall shapes about 35–38 px wide at
  0.625x. The Workshop's gear and the Market's scales are internal details
  that disappear. The Windmill and Monument are the only small processors
  with strong silhouettes.
- **Blank signboards.** `building-city-1…3` include empty cream signboards
  that read like missing text or placeholders.
- **Two kinds of tree.** The Lumber Camp's trees are pale, fluffy and
  brown-trunked, while the Forest trees are dark, glossy "lollipops". The
  same terrain appears in two styles on neighbouring tiles.

#### M2. Naval silhouettes and embarked units

- **Assets:** `unit-original-patrol-boat`, `unit-shared-embarked-transport`.
- **Evidence:**
  [unit silhouettes](../../../art/reviews/sprite-review-2026-09/50-unit-silhouettes-1x-0625x.png),
  [roster water row](../../../art/reviews/sprite-review-2026-09/15-roster-z0625-dpr1-forest-mountain-water-enlarged3x.png).
- At 0.625x the Patrol Boat and the Embarked Transport are the same
  low-wedge silhouette, told apart only by grey versus timber color.
- Every embarked role uses the same rowboat. A carried Catapult or Knight is
  invisible on the map, so the player has to inspect the unit.

#### M3. Some resources are unclear or too loud

- **Evidence:**
  [resources at 1x](../../../art/reviews/sprite-review-2026-09/30-resources-z1-dpr1.png),
  [resources at 0.625x, DPR 2](../../../art/reviews/sprite-review-2026-09/33-resources-z0625-dpr2.png).
- `terrain-ruleset7-resource-fertile-ground` reads as three brown blobs
  (potatoes or dung) rather than fertile soil.
- `terrain-ruleset7-original-game-fox` is 38 x 21 px at 0.625x and vanishes
  under trees.
- The fruit, deer, ore and pearls read well, but their saturation competes
  with units (see H1).

#### M4. Technology and action art mixes three icon languages

- **Evidence:**
  [tech dialog, real UI](../../../art/reviews/sprite-review-2026-09/06-tech-dialog-real-ui-dpr1.png),
  [action and reward art, canvas-fit approximation](../../../art/reviews/sprite-review-2026-09/07-action-reward-art-48px-canvas-fit.png).
- Several technologies reuse ground tiles as icons, which read as colored
  squares: Navigation (`terrain-ruleset7-water-deep`) is a plain blue
  square, Engineering is a mountain tile, Farming is an orange square, and
  Roads (and the Build Road action) is a flat brown bar.
- These sit beside cut-out world sprites (Hunting's boar, Drill's Guard,
  Scouting's Raider) and a third, pictogram-style family (Planning arrows,
  Fortification shield, Explosives, action badges).
- **Reading the action sheet:** it fits each whole source canvas into 48 px,
  but the real UI crops some art to its visible pixels. Treat its small
  sizes as approximate. The mix of icon styles is real either way.

### Low

- **L1. Weak faction identity.** Every Original human has the same face,
  tunic and white scarf. That is consistent, but it provides none of the
  "strong visual gimmick" or pulp shape language the direction asks for.
  Faction readability will rest entirely on the next style.
- **L2. Knight rendering.** The Knight's lance is a smooth cone. The Knight
  also carries a sheathed sword, which is a duplicate weapon cue, and its
  horse legs are thin and realistic. The result is less chunky than the rest
  of the roster (see [enlarged detail](../../../art/reviews/sprite-review-2026-09/52-source-pixel-detail-2x-nearest.png)).
- **L3. Thin Roads.** Roads are code-drawn 3 px lines. At 0.625x they are
  barely visible, so a Road network is less legible than the sprites around
  it. This is not a sprite, but the next art style should decide Road width
  and material.
- **L4. Visible grass seams.** Grass variants have visible lighter blotches
  at repeated positions, so a large Grass region shows a faint 128 px
  checker (for example the
  [roster at 1x](../../../art/reviews/sprite-review-2026-09/10-roster-z1-dpr1.png)).

## What works well

- **Consistent unit camera and lighting.** Every land unit faces southeast in
  three-quarter view with a northwest key light. There is no halo, matte or
  baked shadow, and alpha edges are clean at every zoom and DPR checked.
- **A cohesive unit palette.** Tan, cream and teal on units is harmonious and
  separates well from green grass at 1x.
- **Some silhouettes read instantly.** The Juggernaut, Knight, Catapult,
  Battleship, Windmill, Monument, mined Mountain (with its timbered adit) and
  the Port/Shipyard read at 0.625x.
- **Quiet terrain.** Grass and both water depths are calm and low-contrast,
  and Shallow and Deep Water are clearly different. The cased, dashed
  territory border reads well over all terrain.
- **Charming resources.** The apple, pear, plum, deer, ore crystals and clam
  are recognizable immediately. The problem is their prominence, not their
  design.
- **Good portraits.** Portraits and character art are appealing at 72 px in
  the tech dialog. The same pieces are fine as UI art even where they fail as
  map pieces.
- **The right tone.** Friendly, toy-like and non-violent, as the direction
  asks.

## Recommendations for the next art style

These are the qualities to preserve or avoid, and the on-screen targets the
candidates in `pulp_wars-73l.2` should be judged against.

### Target on-screen sizes

Design for **0.625x as the primary view**, with 1x as the comfortable zoom.
The minimum-zoom figures below are CSS px (multiply by 2 for DPR 2 device
pixels).

| Class                 | Width @1x (% of 128 px tile) | Height @1x      | At 0.625x    | Notes                                                                       |
| --------------------- | ---------------------------- | --------------- | ------------ | --------------------------------------------------------------------------- |
| Standard unit         | 55–65% (70–83 px)            | 75–90% (96–115) | ≥ 45 x 60    | today about 42% x 46%; allow upward overlap into the row above like Forests |
| Mounted / siege       | 70–80%                       | 75–95%          | ≥ 55 wide    | must stay clearly smaller than giants                                       |
| Giant (Juggernaut)    | 85–95%                       | 110–130%        | ≥ 55 x 70    | systematically largest unit                                                 |
| Ship                  | 65–85%                       | 45–60%          | ≥ 40 wide    | role shape (hull and guns) plus a large owner-colored sail or flag          |
| City levels 1 / 2 / 3 | 80% / 90% / 100%             | up to 120%      | —            | each level adds a large form; must stay recognizable behind a unit          |
| Village               | 55–65%                       | ≤ 70%           | —            | clearly smaller than city level 1; neutral colors                           |
| Processor building    | 50–65%                       | ≤ 80%           | ≥ 32 wide    | unique silhouette per type                                                  |
| Resource marker       | 30–40%                       | 25–35%          | ≤ 26 wide    | below unit size; lower saturation than units                                |
| Outline               | —                            | —               | ≥ 1.5 CSS px | one line weight in CSS px across all classes (about 2–3 px at 1x)           |

### Preserve

- The three-quarter southeast view with northwest light, clean transparency,
  and renderer-owned shadows and UI.
- Quiet, low-contrast ground, distinct water depths, and the cased dashed
  territory border.
- The friendly, toy-like tone and the immediate recognizability of the
  resource objects, but at a smaller size and lower saturation.
- Deriving portraits from world sprites, so UI and map identity match.

### Avoid

- Authoring at 256–384 px and downsampling to 0.24–0.3. Author at or near
  final size (for example, units drawn for about 100 px at 1x, 2x for DPR 2),
  or use a style whose shapes survive downsampling: large flat regions and
  thick outlines.
- Detail below 2 px at 0.625x: stitching, buckles, facial features, brick
  courses, gears and scale pans.
- Per-asset display-scale fudges. Use one scale per class and one outline
  weight on screen.
- Baked fixed-color "faction patches". Put ownership on the sprite as a
  large, recolorable area (tabard, banner, sail, roof) of 15–25% of the
  visible area, backed by a mandatory runtime recolor and checked in all four
  player colors. Keep the badge as a secondary cue and move it off the health
  bar.
- Role differences that live only in a thin prop. Differentiate roles by body
  mass, mount, posture and headgear first. Adopt a black-silhouette test at
  0.625x as an acceptance gate, like
  [`50-unit-silhouettes`](../../../art/reviews/sprite-review-2026-09/50-unit-silhouettes-1x-0625x.png).
- Isometric or diamond pieces and diagonal field patterns on the square grid.
  Improvements such as Farms should be muted and aligned to the grid.
- Hard-edged ground squares with no transition between Grass and Mountain.
- Mixing eras inside one faction. Choose one pulp gimmick per faction and
  apply it to units, ships and buildings alike.

## Evidence index

All files are PNG. "zN" is camera zoom and "dprN" is device-pixel ratio.

- [01-units-source.png](../../../art/reviews/sprite-review-2026-09/01-units-source.png)
- [02-buildings-source.png](../../../art/reviews/sprite-review-2026-09/02-buildings-source.png)
- [03-terrain-source.png](../../../art/reviews/sprite-review-2026-09/03-terrain-source.png)
- [04-resources-source.png](../../../art/reviews/sprite-review-2026-09/04-resources-source.png)
- [05-portraits-source.png](../../../art/reviews/sprite-review-2026-09/05-portraits-source.png)
- [06-tech-dialog-real-ui-dpr1.png](../../../art/reviews/sprite-review-2026-09/06-tech-dialog-real-ui-dpr1.png)
- [07-action-reward-art-48px-canvas-fit.png](../../../art/reviews/sprite-review-2026-09/07-action-reward-art-48px-canvas-fit.png)
- [10-roster-z1-dpr1.png](../../../art/reviews/sprite-review-2026-09/10-roster-z1-dpr1.png)
- [11-roster-z1-dpr2.png](../../../art/reviews/sprite-review-2026-09/11-roster-z1-dpr2.png)
- [12-roster-z0625-dpr1.png](../../../art/reviews/sprite-review-2026-09/12-roster-z0625-dpr1.png)
- [13-roster-z0625-dpr2.png](../../../art/reviews/sprite-review-2026-09/13-roster-z0625-dpr2.png)
- [14-roster-z0625-dpr1-coral-teal-enlarged3x.png](../../../art/reviews/sprite-review-2026-09/14-roster-z0625-dpr1-coral-teal-enlarged3x.png)
- [15-roster-z0625-dpr1-forest-mountain-water-enlarged3x.png](../../../art/reviews/sprite-review-2026-09/15-roster-z0625-dpr1-forest-mountain-water-enlarged3x.png)
- [20-settlement-z1-dpr1.png](../../../art/reviews/sprite-review-2026-09/20-settlement-z1-dpr1.png)
- [21-settlement-z1-dpr2.png](../../../art/reviews/sprite-review-2026-09/21-settlement-z1-dpr2.png)
- [22-settlement-z0625-dpr1.png](../../../art/reviews/sprite-review-2026-09/22-settlement-z0625-dpr1.png)
- [23-settlement-z0625-dpr2.png](../../../art/reviews/sprite-review-2026-09/23-settlement-z0625-dpr2.png)
- [24-settlement-coral-capital-z1-dpr2-crop.png](../../../art/reviews/sprite-review-2026-09/24-settlement-coral-capital-z1-dpr2-crop.png)
- [25-settlement-teal-city-z1-dpr2-crop.png](../../../art/reviews/sprite-review-2026-09/25-settlement-teal-city-z1-dpr2-crop.png)
- [30-resources-z1-dpr1.png](../../../art/reviews/sprite-review-2026-09/30-resources-z1-dpr1.png)
- [31-resources-z1-dpr2.png](../../../art/reviews/sprite-review-2026-09/31-resources-z1-dpr2.png)
- [32-resources-z0625-dpr1.png](../../../art/reviews/sprite-review-2026-09/32-resources-z0625-dpr1.png)
- [33-resources-z0625-dpr2.png](../../../art/reviews/sprite-review-2026-09/33-resources-z0625-dpr2.png)
- [40-natural-round15-fit-z0625-dpr1.png](../../../art/reviews/sprite-review-2026-09/40-natural-round15-fit-z0625-dpr1.png)
- [42-natural-round15-fit-z0625-dpr2-crop.png](../../../art/reviews/sprite-review-2026-09/42-natural-round15-fit-z0625-dpr2-crop.png)
- [43-natural-round15-z09-dpr1.png](../../../art/reviews/sprite-review-2026-09/43-natural-round15-z09-dpr1.png)
- [50-unit-silhouettes-1x-0625x.png](../../../art/reviews/sprite-review-2026-09/50-unit-silhouettes-1x-0625x.png)
- [51-building-silhouettes-1x-0625x.png](../../../art/reviews/sprite-review-2026-09/51-building-silhouettes-1x-0625x.png)
- [52-source-pixel-detail-2x-nearest.png](../../../art/reviews/sprite-review-2026-09/52-source-pixel-detail-2x-nearest.png)

## How the evidence was produced

- **Runtime.** The user's development server at `http://localhost:6173`
  (`?ruleset=7`, runtime `pulp-wars-poc-7r12`) was left running and was
  driven by headless Chrome 153 over the DevTools protocol.
- **Synthetic scenes** (`roster`, `settlement`, `resources`). These were built
  as presentation-only `PlayerViewV7` objects in the page and drawn with the
  production `buildBoardRenderPlanV7`, `drawBoardV7` and
  `createBoardImageResolverV7`, which includes raised Forest and Mountain
  terrain. This is the same technique as
  [`scripts/browser-farm-review-v7.ts`](../../../scripts/browser-farm-review-v7.ts).
  Each scene was rendered at zoom 1 and 0.625, DPR 1 and 2, with four owner
  colors. Placement legality was not enforced, because only presentation was
  being judged.
- **Natural game.** Seed 11 with the default setup (one AI) was played by a
  seeded scripted autoplayer for 15 rounds and captured in the real UI at
  1440 x 900. The fit camera gave 0.625x (DPR 1 and 2), and two Zoom-in
  presses gave about 0.9x. The Technology dialog was also captured.
- **Contact sheets and crops.** These were composed with `sharp`: source
  sheets, alpha silhouettes at true display size, 2x nearest-neighbour source
  detail, and 3x nearest-neighbour enlargements of minimum-zoom DPR 1
  captures.
- **Sizes.** Visible sizes come from each source PNG's non-transparent bounds
  (alpha above 8) multiplied by the display scale in `board-art-geometry.ts`.
- **Scripts and files.** The capture and compositing scripts were throwaway
  scratch files and are not committed. No checked-in review or smoke script
  was run, so no checked-in evidence was rewritten. The total evidence size is
  about 12 MiB.
