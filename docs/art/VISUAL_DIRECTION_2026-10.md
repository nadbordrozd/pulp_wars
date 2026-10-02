# Visual direction study, October 2026: less clutter, faction colours, player markers

**Status:** exploration for bead `pulp_wars-3tq.1`. The user reviewed it
(`pulp_wars-3tq.2`) and asked for a fully worked-out demo of the Human
faction before any rollout; that demo is [section 11](#11-human-demo) (bead
`pulp_wars-3tq.3`), which also changes some of the rules proposed below and
what the developer toggle draws. The user then chose the direction
(`pulp_wars-3tq.4`); [section 12](#12-production) records the production art
(bead `pulp_wars-3tq.5`), and [section 13](#13-live-default) records how
bead `pulp_wars-3tq.6` made the direction the default look of the CHIBI art
set. Sections 1 to 12 are kept as written at the time: where they say
"today", "by default" or "the developer toggle", read them as history;
section 13 is the current behaviour. The
[chibi art direction](CHIBI_ART_DIRECTION.md) governs production art; its
section 4a holds the rules this direction changed.

The user's brief: a developed map looks cluttered and slightly unpleasant;
whole garments and whole roofs in the player colour look weird ("trolls in
bright yellow pants"); yet seeing at once who owns a unit is very good. The
wanted direction keeps (1) units of several players fielding the same unit
clearly distinguishable, (2) nothing weird or ugly, and (3) less clutter:
units stand out, buildings and terrain recede. Scope: diagnose and
recommend, on the Human faction and three units only.

## 1. Summary

- **Diagnosis.** Today everything is drawn at the same visual weight, and
  the player colour is on everything. Units, buildings, wheat, roads, HP
  bars and borders all use black outlines, full saturation and full
  contrast, so nothing recedes; 62% of all player-coloured pixels on a busy
  map are _not_ on units, so the colour that should say "this unit is mine"
  mostly says "this roof is mine".
- **Recommendation.** Reserve the saturated player colour for units and
  their markers. Give each faction a fixed, muted palette for garments and
  roofs. Show the player by a **base under the unit's feet** (colour plus a
  seat-specific shape), a **small accent on the sprite** (crest, shield
  face, hood, plume, pennant) and a **pennant on each city**, with the
  territory border as a thin solid line. Recede buildings, cities and
  terrain by code (lower contrast, lower saturation, coloured outlines).
  Cut the chrome: no seat badge, the HP bar only when damaged, the ready
  cue on the base.
- **Effect, measured on the test bench.** The backdrop's edge density falls
  by 42% (108.7 to 62.7), units carry 4.4 times the backdrop's detail
  instead of 2.5 times, and the share of player-coloured pixels that sit on
  units and their markers rises from 38% to 46% (section 4).
- **Cost.** Most of it is code-side. PixelLab is needed only to move unit
  owner masks from garments to accents: about one edit call per unit sprite
  and portrait, roughly 120 calls (about US$1.50) for all four factions.
  This study used 4 PixelLab calls.
- **See it live.** The direction is what the game draws by default
  ([section 13](#13-live-default)); Settings > Developer tools > Classic
  look (previous art) returns to the look this study started from. The
  study's sheets are still reproduced by
  `npm run art:visual-direction-review`.

Key comparisons (all under
[`art/explorations/visual-direction-2026-10/review/`](../../art/explorations/visual-direction-2026-10/review/)):

| Image                                | Shows                                                         |
| ------------------------------------ | ------------------------------------------------------------- |
| `before-after-phone-zoom-0.75.png`   | today beside the recommendation, phone, fit zoom (worst case) |
| `before-after-phone-zoom-1.png`      | the same at zoom 1                                            |
| `before-after-desktop-zoom-1.png`    | desktop at zoom 1                                             |
| `before-after-desktop-zoom-0.75.png` | desktop at zoom 0.75                                          |
| `factors-desktop.png`                | one lever changed at a time                                   |
| `candidates-desktop.png`             | the candidate directions, desktop                             |
| `candidates-phone-zoom-0.75.png`     | the candidate directions, phone                               |
| `same-unit-phone-zoom-0.75.png`      | four players' Fighters, with colour-blindness simulations     |
| `sample-units-x4.png`                | production sprites, code-side cream, and the PixelLab samples |
| `empty-map-desktop.png`              | bare terrain, and the map without units, for reference        |

![Today beside the recommended direction on a phone at zoom 0.75](../../art/explorations/visual-direction-2026-10/review/before-after-phone-zoom-0.75.png)

## 2. How other games do it

Short notes on what is reusable; sources are listed at the end.

| Game or practice                 | How ownership is shown                                                                                                                                   | What keeps the map readable                                                                                               | Reusable here                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Polytopia                        | The tribe is the player: units wear the tribe colour, and a mirror match gives each player a recoloured copy of the tribe. Borders are thin solid lines. | Flat low-poly shapes without outlines, few colours per object, one small HP number, almost no other chrome.               | Thin solid borders; almost no per-unit chrome; flat, calm buildings.      |
| Advance Wars, Wargroove          | Whole-palette swap: Wargroove draws every unit in a "red team" palette with a faction-colour range, a skin range and fixed colours.                      | Terrain is flat and low-contrast; spent units are greyed; HP is a small number shown only when damaged.                   | HP only when damaged; a fixed-colour range that never changes with owner. |
| Into the Breach                  | Few units; side is shown by shape (mechs against bugs) and outline colour.                                                                               | Muted, simplified environment tiles; information is carried by a small set of abstract markers.                           | The environment is deliberately duller than the pieces.                   |
| Civilization V and VI            | A flag or shield above each unit in the civilisation's two "jersey" colours; borders in the same colours.                                                | Units are realistic and not recoloured, so the flag is the only owner cue.                                                | A marker separate from the sprite carries ownership.                      |
| Age of Empires, Age of Mythology | Small player-colour areas on units and buildings (shields, banners, roof trims), an outline when hidden, and a coloured ring under selected units.       | Buildings keep their civilisation's own materials; only accents change.                                                   | Accents instead of whole garments; rings under units.                     |
| StarCraft II                     | Team-colour accents on a fixed race palette.                                                                                                             | Blizzard's map guidance puts unit readability first: limited environment palettes so colour does not pull from the units. | Limit the palette of everything that is not a unit.                       |
| Fire Emblem                      | Blue, red and green sprite palettes for player, enemy and neutral.                                                                                       | A plain grid and small sprites.                                                                                           | (Works for two sides only.)                                               |
| Tabletop miniatures              | Painted base rims or clip-on base rings mark squads and players; the model keeps its faction paint scheme.                                               | The base is the same shape on every model, so it reads as a marker, not as part of the figure.                            | A coloured base under every unit; faction scheme on the figure.           |
| Awesomenauts (Ronimo) dev blog   | Not applicable.                                                                                                                                          | Gameplay objects get outlines, deeper shading and more saturation; the background is desaturated and loses its outlines.  | Outlines and saturation are for pieces; backgrounds get neither.          |

Three techniques recur and are missing here today: (a) saturated colour and
hard outlines are reserved for the pieces; (b) ownership sits on a small,
fixed-place marker (base ring, flag, shield) or on small accents, not on
whole surfaces; (c) per-unit chrome is shown only when it carries news (HP
when damaged).

## 3. The test bench

`npm run art:visual-direction-review` (source:
[`scripts/art/visual-direction-review.ts`](../../scripts/art/visual-direction-review.ts),
[`scene.ts`](../../scripts/art/visual-direction/scene.ts),
[`variants.ts`](../../scripts/art/visual-direction/variants.ts)) draws one
deterministic busy map through the real `CanvasBoardHostV7` in headless
Chrome and writes the comparison sheets and `metrics.json`.

- **Scene:** 13 x 11 cells on the fixed Showcase board. Four players who
  all play Human (Coral, Teal, Gold, Violet), a city each at levels 1 to 3,
  a Village, all eleven improvements, Roads, Forest, Mountains, coast.
  Thirty-six Fighters, Marksmen and Knights of the four players intermixed:
  on open ground, on improvements, in cities, on a Field Defense, damaged,
  ready and spent. It is deliberately denser than a real game.
- **Views:** desktop 1440 x 900 at DPR 1 and phone 390 x 844 at DPR 3, each
  at zoom 1 and 0.75, plus the map without units and the bare terrain.
- **Variants:** a `BoardVisualDirectionV7` value
  ([`visual-direction-v7.ts`](../../src/render/canvas/visual-direction-v7.ts))
  names every lever; a variant is today's rendering with some levers moved.
  "Today" passes no direction at all, so it is the shipping board.
- **Measurements** (desktop, zoom 1, the scene patch): unit pixels are the
  pixels that differ between the scene with and without units.
  - _backdrop edge density_: mean Sobel gradient of the luma of the map
    without units, a proxy for how busy the backdrop is;
  - _unit-to-backdrop edge ratio_: mean gradient on unit pixels divided by
    the backdrop's, a proxy for how much the units stand out;
  - _backdrop saturated share_: share of strongly saturated pixels;
  - _player colour on units_: share of all player-coloured pixels that lie
    on units and their markers;
  - _backdrop player colour_: player-coloured pixels per thousand in the map
    without units.

The proxies support the judgement; they do not replace looking.

## 4. Diagnosis

![One lever changed at a time](../../art/explorations/visual-direction-2026-10/review/factors-desktop.png)

| Variant (one lever from today)                 | Backdrop edge density | Unit-to-backdrop edge ratio | Backdrop saturated share | Player colour on units | Backdrop player colour (per 1000) |
| ---------------------------------------------- | --------------------- | --------------------------- | ------------------------ | ---------------------- | --------------------------------- |
| Today                                          | 108.7                 | 2.54                        | 13.2%                    | 37.6%                  | 71.7                              |
| No player colour on buildings and cities       | 108.6                 | 2.54                        | 11.2%                    | 48.4%                  | 46.1                              |
| Building and city saturation 50% (the sliders) | 108.7                 | 2.54                        | 3.5%                     | 54.0%                  | 36.2                              |
| Buildings and cities lighter, lower contrast   | 83.6                  | 3.27                        | 12.6%                    | 30.1%                  | 111.0                             |
| Buildings and cities with a coloured outline   | 101.2                 | 2.72                        | 13.2%                    | 37.3%                  | 72.6                              |
| Buildings at 80% size                          | 89.7                  | 3.05                        | 9.8%                     | 45.4%                  | 52.3                              |
| Reduced chrome                                 | 99.4                  | 2.82                        | 13.4%                    | 34.3%                  | 73.5                              |
| Calmer terrain texture                         | 97.5                  | 2.83                        | 12.6%                    | 38.7%                  | 68.7                              |
| Base disc under each unit                      | 108.7                 | 2.40                        | 13.2%                    | 48.0%                  | 71.7                              |
| Light rim around each unit                     | 108.7                 | 2.81                        | 13.2%                    | 38.1%                  | 71.7                              |
| Unit garment cream, accent in player colour    | 108.7                 | 2.72                        | 13.2%                    | 26.0%                  | 71.7                              |
| Unit garment cream, no player colour           | 108.7                 | 2.80                        | 13.2%                    | 16.6%                  | 71.7                              |
| **Recommended (all together)**                 | **62.7**              | **4.4**                     | **9.4%**                 | **46.4%**              | **60.0**                          |

Findings, in order of weight:

1. **The backdrop is as loud as the units.** Buildings, cities and
   especially Farms carry the same black outline, saturation and contrast
   as units. Lowering building and city _contrast and lightness_ is the
   single biggest lever (edge density 108.7 to 83.6, unit ratio 2.54 to
   3.27). **Saturation alone does little:** the existing sliders at 50%
   leave edge density and the unit ratio unchanged, because the black
   outlines and the light/dark texture stay. This is why the slider
   experiment did not feel like a fix.
2. **The player colour is spent on the backdrop.** Only 38% of
   player-coloured pixels are on units; roofs, sails, awnings and dashed
   borders hold the rest. A unit on its own windmill or in its own city
   merges with it. Taking the player colour off buildings raises the share
   on units to 48% at no cost in information, because territory already
   says who owns a building.
3. **Wheat collides with the Gold player.** Farms are the most common
   improvement and their wheat has the Gold player's chromaticity: the
   "lighter buildings" row shows backdrop player colour _rising_ to 111 per
   thousand. Farms need their saturation lowered or a paler straw, whatever
   else is decided; the recommendation lowers it (60.0 with every other
   change included).
4. **Chrome is constant, so it is noise.** Every unit has a full-height HP
   bar and a numbered badge all the time; 36 units make 72 marks that say
   nothing new. Showing HP only when damaged and dropping the badge removes
   about 9% of backdrop edges and, more importantly, the vertical bars that
   read as part of the neighbouring sprite. The black-cased cream Roads and
   the 8 px dashed borders are high-contrast linework over the whole map.
5. **Whole garments in the player colour are the "weird" part, and they are
   not needed for ownership.** With a base under the unit, the share of
   player colour on units goes from 38% to 48% without any colour on the
   sprite. Units in cream with a small accent look like one army's soldiers
   instead of four costume sets (see `sample-units-x4.png`).
6. **Sprite size and the square grid matter less than expected.** Buildings
   at 80% size help (edge density 89.7) because grass shows between pieces,
   but code-side scaling of pixel art is ugly, so it would mean regenerating
   every building; receding by tone gets most of the benefit for free. A
   unit cannot stand "in front of" a building on a square top-down grid, but
   the base separates the two well enough.
7. **Outlines.** A coloured outline on buildings is a small measured gain
   (101.2) and a clear visual one: without the black line a building stops
   competing with the black-outlined units. A light rim around units helps
   a little (ratio 2.81) but adds linework and is not needed with a base.
8. **The four player colours are weak for red-green colour blindness.**
   Under simulated deuteranopia and protanopia, Coral and Teal both turn
   grey-olive (see `same-unit-phone-zoom-0.75.png`). This is true today as
   well, where only the tiny seat number separates them. Any marker should
   therefore also differ by shape.

## 5. Candidates

![Candidate directions on the desktop](../../art/explorations/visual-direction-2026-10/review/candidates-desktop.png)

| Candidate                                                   | Backdrop edge density | Unit-to-backdrop edge ratio | Player colour on units | Verdict                                                                                                                                                 |
| ----------------------------------------------------------- | --------------------- | --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today                                                       | 108.7                 | 2.54                        | 37.6%                  | Baseline.                                                                                                                                               |
| C1 Sliders only (saturation 50%)                            | 108.7                 | 2.54                        | 54.0%                  | Rejected: greyer, not calmer.                                                                                                                           |
| C2 Receded faction-colour buildings, rest as today          | 81.4                  | 3.35                        | 43.5%                  | Better backdrop; garments still weird, chrome still heavy. A valid first step.                                                                          |
| C3 Cream units, player on a shape badge only                | 62.7                  | 4.91                        | 21.0%                  | Rejected: calmest, but ownership needs a search for a 10 px badge. Fails requirement 1.                                                                 |
| C4 Accent units, base ring                                  | 62.7                  | 4.65                        | 35.2%                  | Works; the ring is thinner than the sprites' outlines and gets lost on Farms and Roads.                                                                 |
| C5 Accent units (code-side), base disc                      | 62.7                  | 4.36                        | 42.8%                  | Good, and needs no PixelLab: the crest, hood or plume stays in the player colour by a row split of today's mask. The accent is small on the Fighter.    |
| C6 Full player garments, base disc                          | 62.7                  | 4.04                        | 51.1%                  | Strongest ownership; keeps the "yellow pants". The fallback for a faction whose sprites are not yet redone.                                             |
| C7 Recommended with slate roofs                             | 62.7                  | 4.40                        | 46.7%                  | Equal; slate is cooler and further from Coral, muted brick is warmer and closer to today's look.                                                        |
| C8 Recommended with every base round                        | 62.7                  | 4.40                        | 46.4%                  | Prettier bases, but Coral and Teal are then told apart by hue alone.                                                                                    |
| **Recommended** (PixelLab accent samples, seat-shaped base) | **62.7**              | **4.40**                    | **46.4%**              | Chosen: ownership reads from the base at a glance and is confirmed by the shield face, hood or pennant; nothing looks like a costume; backdrop recedes. |

Iterations that were tried and dropped along the way:

- contrast lowered toward mid grey turned the grass olive and the whole map
  drab; contrast is now lowered toward each sprite's own mean colour (land
  terrain toward its ground's mean), which keeps hue and brightness;
- building saturation 60% with a grey-brown roof looked dusty; the roof is
  a muted brick `#b0705c` and saturation is 65% with 10% lightening;
- a thin cream ready rim was invisible; the ready cue is a 4 px warm-white
  rim with a dark edge around the base;
- the first Fighter edit painted the face red; the second instruction names
  the face (see the recipes below).

### The same-unit, four-player case

![Four players' units on a phone at zoom 0.75, normal and simulated colour blindness](../../art/explorations/visual-direction-2026-10/review/same-unit-phone-zoom-0.75.png)

At phone size and zoom 0.75 a tile is 60 CSS px. In the recommended
direction each Fighter stands on a 45 x 16 px base in the player colour, and
its shield face and crest repeat the colour; the four players' Fighters can
be told apart without looking for a badge. Under simulated deuteranopia and
protanopia Violet and Gold stay distinct, and Coral and Teal both turn
grey; there the base _shape_ decides: round (seat 1), pointed (seat 2),
square (seat 3), swallow-tailed (seat 4). City pennants carry the same
shapes. This is better than today, where the same two colours collapse and
the only other cue is an 11 px seat number.

## 6. Recommended direction

Rules, as they would enter the art direction. "Player colour" is the
owner's colour; "faction colours" are fixed per faction and never change
with the owner.

**Colour roles**

1. The saturated player colour appears only on: unit bases, unit accents,
   city pennants, territory borders, and interface elements. Nothing else on
   the map is drawn in a player colour.
2. Each faction has a fixed palette for cloth and roofs, chosen in a muted
   band (saturation under about 45%) so it never reads as a player colour.
   Human: cream cloth `#e6dcc3`, light steel, muted brick roofs `#b0705c`.
   Other factions pick theirs when they are redone (for example Undead
   bone and sickly green, Goblin scrap and rust), under the same rule.
3. No improvement, resource or terrain uses a colour close to a player
   colour at full saturation. Wheat in particular is paler than Gold.

**Units**

4. A unit's owner mask covers one or two small, well placed accents: a
   crest, a shield face, a hood, a plume, a pennant, a sail stripe. Target
   10–20% of opaque pixels (today 20–40%); the rest of the garment is in
   the faction palette. The key colour and the mask pipeline are unchanged.
5. Units keep the black outline and full saturation. They are the only
   black-outlined, fully saturated things on the map.
6. Every unit stands on a code-drawn base: a flat ellipse about 60 x 22 CSS
   px at zoom 1 in the player colour with a dark outline, centred under the
   feet. The base's outline shape is the seat's shape. (The rule "nothing is
   drawn under it" still holds for the sprites: the base is an overlay.)

**Buildings, cities and terrain**

7. Buildings and cities carry no player colour. Their masks are recoloured
   to the faction roof colour. Ownership of a building is its territory.
8. Buildings recede: saturation 65%, contrast 70% around the sprite's mean,
   10% lighter, and the black outline replaced by a darker tone of the fill
   beside it (75%). Cities recede less (85%, 85%, 3%, 60%), so a city still
   outranks an improvement.
9. A city shows its owner by a pennant on a pole at its top-left corner, in
   the player colour, carrying the seat shape; the capital's shape is gold.
10. Terrain keeps its hue and brightness but has less texture: contrast 65%
    around the ground's mean and a 60% coloured outline on trees and rocks.

**Chrome**

11. No seat badge on units or cities.
12. The HP bar is drawn only for a damaged unit: a short horizontal bar on
    the base, green, amber below two thirds, red below one third.
13. A unit ready to act has a bright warm-white rim around its base; the
    sprite outline glow is not drawn.
14. Territory borders are one solid 2 px line in the player colour with a
    soft dark casing; a shared border alternates the two colours.
15. Roads lose the black casing and are slightly darker.
16. Population pips, the Field Defense badge, status chips and selection
    and target outlines are unchanged in this study.

**What stays as it is:** the chibi unit style, the camera, the grid, the
sprite sizes, the mask-based recolour, the terrain art.

## 7. Known weaknesses

- **Coral and Teal for red-green colour blindness.** The base shapes solve
  it, but the palette itself could be improved (a darker, bluer Teal or a
  lighter Coral would differ in brightness). Not changed here.
- **Seat-shaped bases are less pretty than round ones.** The square and
  swallow-tailed bases look slightly like signs. C8 (all round) is the
  alternative if colour alone is judged enough.
- **A unit behind a city.** A unit standing directly north of a city has
  its base hidden by the city's upward overflow.
- **Ships.** A base on water looks odd. Ships should carry the player colour
  on the sail and a pennant and skip the base, or get a ring-shaped wake.
- **Giants and wide units** get a wider base that can touch the next cell.
- **Other factions are not designed.** With the developer toggle, Undead,
  Goblin and Dinosaur units keep their player-coloured garments and get a
  base (candidate C6); their cities are recoloured to the Human brick, which
  is wrong for them.
- **The samples are edits, not finished art.** The Fighter kept brown boots
  and straps, the Marksman gained a steel cap and a few cheek pixels in its
  mask, and the Knight's outline thinned. Production versions need the
  normal review.
- **Ready cue.** The rim is clear on the test bench but weaker than today's
  glow; it has not been tried in play.
- **Portraits and the interface** still show whole-garment player colour.
- **Runtime toning** reads and rewrites each building sprite once per
  owner; for production the receded sprites should be baked by the
  pipeline.
- **The measurements are proxies** and the scene is denser than a real map.

## 8. Rollout plan and cost

Everything in steps 1 and 2 is code-only and reversible, and can ship
before any art is regenerated.

| Step | Work                                                                                                                                                                              | Means                                                             | PixelLab calls |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- |
| 1    | Chrome: bases with seat shapes, HP when damaged, ready rim, city pennants, solid borders, calm Roads. Decide ships, giants and garrisons.                                         | Code (renderer), tests, browser smoke                             | 0              |
| 2    | Buildings, cities and terrain recede; roofs take the faction colour. Bake the toned sprites in the pipeline instead of at runtime; pick faction roof colours for the other three. | Code (pipeline step over the 10 improvements and 12 city sprites) | 0              |
| 3    | Human units: move the owner mask to accents. 11 unit sprites and 10 portraits, as edits of the accepted sprites.                                                                  | PixelLab edits, mask review, overrides where needed               | about 35       |
| 4    | Undead, Goblin and Dinosaur units and portraits (25 sprites, 24 portraits), after a short palette decision per faction.                                                           | PixelLab edits                                                    | about 85       |
| 5    | Optional: Farms with paler straw; smaller building footprints (regenerate 10 improvements).                                                                                       | PixelLab                                                          | about 25       |
| 6    | Update the art direction (owner colour section, class notes, faction fragments) and the mask QA thresholds (coverage 10–20%).                                                     | Docs, pipeline thresholds                                         | 0              |

Estimates assume about 1.7 calls per asset (this study: 4 calls for 3
sprites, one retry) at about US$0.01 per edit call: roughly 120 calls and
US$1.50 for steps 3 and 4, 145 calls with step 5. The cost that matters is
review time, not PixelLab. Between steps 2 and 4, a faction whose sprites
are not redone yet can run as candidate C6 (full garments on a base) or as
C5 for Humans (code-side accent), so the game never has to show a mixed
state that looks broken.

Suggested order: 1, 2, 6, 3, then one faction at a time.

## 9. What this study produced

- **Runtime (off by default):**
  [`src/render/canvas/visual-direction-v7.ts`](../../src/render/canvas/visual-direction-v7.ts)
  (the direction model, sprite toning, the wrapped art resolver, bases,
  pennants, HP and border drawing), six small hook points in
  `board-renderer-v7.ts`, the host wiring in `board-host-v7.ts`, and the
  developer checkbox (Settings > Developer tools > Visual direction,
  stored under `pulpWars.ruleset7.boardVisualDirection.v1`). Without a
  direction the frame is drawn exactly as before; a test checks that the
  baseline direction issues the same canvas calls as none.
- **Test bench:** `npm run art:visual-direction-review`.
- **Exploration assets** in
  [`art/explorations/visual-direction-2026-10/`](../../art/explorations/visual-direction-2026-10/):
  `batch.json`, `faction.md`, `subjects.json`, `records.json`, the receipts
  in `submissions/`, the candidates in `raw/`, the cut samples and masks in
  `assets/` with `samples.json`, and the sheets in `review/`. None is in the
  production manifest; the developer toggle loads the three samples through
  a separate, lazily imported module.

### PixelLab recipes

Four calls through `npm run art:chibi -- generate --exploration
art/explorations/visual-direction-2026-10`, all `edit-image-pixen` edits of
accepted production sprites (seeds and full instructions are in
`batch.json`; requests and job ids in `records.json`):

| Recipe                  | Source                   | Seed  | Result                                                                           |
| ----------------------- | ------------------------ | ----- | -------------------------------------------------------------------------------- |
| `fighter-accent-edit`   | batch 1 `fighter-h-edit` | 71001 | Rejected: the face was painted red.                                              |
| `fighter-accent-edit-b` | batch 1 `fighter-h-edit` | 71002 | Sample: cream tunic; red crest, helmet emblem and shield face; 15.9% owner area. |
| `marksman-accent-edit`  | batch 1 `marksman-c`     | 71011 | Sample: red hood and shoulder cape, cream tunic; 27.7% owner area.               |
| `knight-accent-edit`    | batch 2 `knight-a-edit`  | 71021 | Sample: cream barding with red trim; red plume and lance pennant; 12.5%.         |

`npx tsx scripts/art/visual-direction/samples.ts` cuts candidate 0 of each
sample and extracts its mask with the production key-colour band.

![Production sprites (A), code-side cream (B) and the PixelLab samples (C) in the key and the four player colours](../../art/explorations/visual-direction-2026-10/review/sample-units-x4.png)

## 10. Open questions for the user

1. Is a base under every unit acceptable as the main owner marker, and
   should its shape differ by seat (recommended) or stay round?
2. Human faction colours: cream cloth and muted brick roofs, or slate roofs
   (C7)? The brief suggested red insignia for Humans; red is close to the
   Coral player, so this study keeps saturated colour for players only.
3. Should buildings lose the player colour entirely (recommended), or keep a
   small flag where the art has one?
4. Is the HP bar only when damaged acceptable, or should full HP stay
   visible in some smaller form?
5. Should the player palette be adjusted for colour blindness (Coral and
   Teal)?
6. Ready cue on the base, or keep today's glow?
7. Go ahead with steps 1 and 2 (code only) before any regeneration?

## 11. Human demo

**Status:** bead `pulp_wars-3tq.3`, waiting for the user's review
(`pulp_wars-3tq.4`). It answers the user's decisions on the study
(recorded on `pulp_wars-3tq.2`): shaped base plates; buildings in faction
colours with a small player flag only where it makes sense; the HP bar only
when damaged; Humans in a high-medieval look, red and gold allowed; every
building and city re-created, not toned; and a Farm of crop rows with gaps.
Nothing ships by default: the demo is what the developer toggle
(Settings > Developer tools > Visual direction, "Human faction demo") now
draws, and with the toggle off the board is drawn exactly as before.

To see it, start a Showcase match with three rivals and every seat Human,
with `?art=chibi`, and switch the toggle on. Sections 6 and 8 above are the
study's proposal; where this section differs, this section is the current
proposal.

![Today beside the Human demo on a phone at zoom 1](../../art/explorations/human-demo-2026-10/review/before-after-busy-phone-zoom-1.png)

Evidence, all under
[`art/explorations/human-demo-2026-10/review/`](../../art/explorations/human-demo-2026-10/review/),
written by `npm run art:visual-direction-demo-review`:

| Image                                                     | Shows                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| `before-after-busy-{desktop,phone}-zoom-{1,0.75}.png`     | the busy bench of section 3, today beside the demo                  |
| `before-after-showcase-{desktop,phone}-zoom-{1,0.75}.png` | a real all-Human Showcase match, today beside the demo              |
| `demo-scene-desktop.png`                                  | the demo patch: Farms and Roads, units north of cities, ships       |
| `building-style-candidates-x4.png`                        | every building style sample tried, with the rejected ones           |
| `building-styles-bench-desktop.png`                       | style A against style B on the bench, with units on and beside them |
| `buildings-old-new.png`                                   | every improvement and city tier, old and new, 1:1 and x4            |
| `farm.png`                                                | one Farm, a 3 x 3 block, Roads passing under it, and the sprite x5  |
| `base-plates.png`                                         | the base variants on land, north of cities and on water             |
| `same-unit-phone-zoom-0.75.png`                           | four players' units, as seen and under two colour-vision deficits   |

### What was chosen, and why

**Units: crimson and gold heraldry, as edits of the accepted sprites.** The
Fighter wears a crimson surcoat with a gold cross and carries a heater
shield with a gold lion; the Marksman a crimson hood with a gold trim over
a cream gambeson; the Knight a crowned great helm, a crimson caparison with
a gold trim and a lance pennant. They are `edit-image-pixen` edits of the
production sprites, so the silhouettes, sizes and feet stay and the eight
Human units not yet redone still stand beside them without a break. Fresh
creations of the same three were darker, taller and less chibi, and were
rejected. Nothing on a unit changes with the player: the three samples
carry no owner area (an empty mask), and a Human unit without a sample has
its old owner area painted the faction crimson `#a8202c` by code.

![The demo patch: today above, the Human demo below](../../art/explorations/human-demo-2026-10/review/demo-scene-desktop.png)

**Buildings: style B, smaller and calmer, in fixed faction colours.** Two
treatments were generated for the Windmill, the Forge and the Market and
judged on the bench:

- _A, soft chibi:_ the production style at the full 80 x 88 canvas, with a
  dark-brown outline, less detail and muted colours.
- _B, flatter and smaller:_ a "flat-shaded minimalist" style text, a thin
  outline in a darker tone of each colour, a 64 to 72 px canvas, so the art
  is about 70% of the tile and grass shows round it.

Both are far calmer than today. B was chosen: the smaller footprint is what
separates the layers on a square grid, where a unit cannot stand in front
of a building, and at 1:1 its roofs read as one tone where A's still read
as texture. The honest limit: Pixen does not draw truly flat shading when
asked, so B is "simpler and smaller", not Polytopia-flat. Pixflux has a
flat-shading option and was tried (four calls): it ignored the subject and
drew generic cottages on ground plates, so it was rejected, as was a
lineless Pixen sample that turned to mush at 1:1.

![Every building style sample tried](../../art/explorations/human-demo-2026-10/review/building-style-candidates-x4.png)

All ten improvements and City 1 to 3 were then re-created in style B: cream
plaster with dark oak framing, pale stone and terracotta roofs. None has a
flag, a banner or any player colour in its art.

![Old and new sprite of every improvement and city tier](../../art/explorations/human-demo-2026-10/review/buildings-old-new.png)

**Flags: drawn in code, on five pieces only.** A generated flag would have
to be masked and recoloured, and at this size the generator neither places
nor colours it reliably enough to trust. This was tried on the Port and
City 1 (two edits, last row of the style sheet above): the generator did
add a tidy small red flag, but the production key-colour band then also
takes terracotta roof pixels, so the automatic mask is two to three times
the flag (146 and 98 pixels, spread over the roofs) and would speckle the
roofs in the player colour. It would need a hand-corrected mask per
building, or roofs kept away from red, which the Human palette is not. So
the art is neutral and the renderer draws a small swallow-tailed pennant
in the exact player colour at an authored anchor per sprite
(`DIRECTION_FLAG_ANCHORS_V7`): the same shape, size and colour on every
building, at no generation cost. Which pieces fly one:

| Piece                                                   | Pennant | Reason                                                        |
| ------------------------------------------------------- | ------- | ------------------------------------------------------------- |
| City 1, 2, 3                                            | yes     | on the tower; larger, with the seat shape, gold for a capital |
| Port                                                    | yes     | the pier has a bare mast for it                               |
| Shipyard                                                | yes     | a pole on the boathouse ridge; ships are built for one player |
| Lumber Camp, Sawmill, Workshop, Forge, Market, Monument | no      | a flag adds nothing the territory border does not say         |
| Farm, Mine, Windmill                                    | no      | a field, a hole in a mountain and a mill have no flagpole     |

Fewer is better here: on the bench every extra pennant was one more
saturated mark competing with the bases.

**Farm: rows of wheat with real gaps.** The Farm is an 80 x 80 sprite that
fills its square cell: four horizontal rows of wheat tufts running edge to
edge, with transparent gaps between them. It has no outline box, no
parallelogram, no soil and no owner colour. The cut script moves the rows
to an even 20 px pitch, so the gaps fall on the cell's centre line and on
its top and bottom edges: stacked Farms keep one rhythm and read as one
field, and a Road through the cell centre lies in a gap. The renderer
already draws Roads before improvements, so nothing had to change there: a
Road under a Farm shows through every gap (fully when it runs along the
rows, as a dashed line across them). The wheat is orange-gold calmed toward
pale straw, clearly a crop and clearly not the Gold player's yellow.

![The Farm: today and in the demo](../../art/explorations/human-demo-2026-10/review/farm.png)

Pixen could not draw this directly: it painted soil bands and a fake
transparency chequerboard between the rows. An edit that erased everything
but the plants gave real gaps, and a second edit made the thin ears lush.

**Bases: a smaller plate with a rim in a darker player tone.** Three were
compared on the same units: the study's disc (60 x 22 px, near-black
outline), a thick ring, and a smaller plate (52 x 18 px) whose rim is a
darker tone of the player colour. The ring is lost under the sprites'
black outlines; the disc is the heaviest mark on the map; the plate reads
at a glance and stops looking like a sign. Each seat keeps its shape
(round, pointed, square, swallow-tailed), as the user chose.

- _Ships:_ a filled plate on water looks like a raft. A ship keeps its sail
  in the player colour (ships are shared by every faction) and stands in a
  thin round ring, like its own wake; nothing is filled.
- _A unit north of a city:_ today's cities reach 24 px into the cell above
  and hide the base there. The new cities are drawn inside their cell (City
  3 reaches 5 px up with one narrow tower), and City 3's pennant flies from
  the side of its tower instead of above it, so the base stays visible.

![Base variants on land, north of cities and on water](../../art/explorations/human-demo-2026-10/review/base-plates.png)

**Chrome**, as in the study: no seat badge; the HP bar only for a damaged
unit, on the base; the ready cue as a bright rim round the base; thin solid
territory borders; calm Roads. The seat shapes make a numbered badge
unnecessary for colour-blind players (see `same-unit-phone-zoom-0.75.png`).

**Terrain** is unchanged art, toned as in the study.

### The rules, now concrete

These replace rules 1, 2, 4, 6, 7, 8 and 9 of section 6.

1. **Faction colours are fixed and may be saturated.** Human: crimson
   `#a8202c` and gold on steel and cream for units; cream plaster, dark oak,
   pale stone and terracotta roofs for buildings. A faction colour may be
   close to a player colour: the player is never read from a garment or a
   roof.
2. **The player colour appears only on:** the base under a unit, a ship's
   sail and ring, the pennant of a city, a Port and a Shipyard, the
   territory border, and the interface.
3. **Units** keep the chibi style, the black outline and full saturation,
   and carry no owner area (ships excepted). A redone unit is an edit of
   its accepted sprite unless its design changes.
4. **Buildings and cities** are generated in the calmer building style:
   simpler shapes, an outline in a darker tone of each colour, no flag in
   the art. An improvement is 64 to 72 px wide on its canvas and stands at
   the bottom of its cell; a city fills the cell's width and stays inside
   its height (at most 8 px above it).
5. **A pennant** is drawn in code at an authored anchor, and only on a
   piece with a mast, a tower or a ridge that a flag belongs on.
6. **The Farm** is a full-cell pattern of crop rows with transparent gaps,
   with no outline box and no owner colour; its gaps lie on the cell's
   centre line and edges.
7. **The base** is a flat plate about 52 x 18 CSS px at zoom 1 in the
   player colour, with a rim in a darker tone of it, in the seat's shape; a
   ship's is an unfilled round ring.

### Known weaknesses

- **The buildings are calmer, not flat.** See above; a truly flat style
  would need another generator or hand-made art.
- **The set is not perfectly even.** City 1 is cream plaster with a heavier
  outline, City 2 grey stone and City 3 pale sandstone; the roofs are a
  fairly strong terracotta. The Sawmill shows a wheel, not a saw blade; the
  Market is a house with an awning and lost its crates in the ground-removal
  edit; the Lumber Camp lost its pine trees and reads as a cottage with
  logs. Production versions need the normal per-asset review.
- **The Mine and the Village are not re-created.** A Mine is a Mountain
  terrain sprite and a Village is neutral; both are only toned by code.
- **Improvements are one shared set.** The runtime has one subject per
  improvement for every faction, so with the toggle on an Undead, Goblin or
  Dinosaur player's improvements also draw as Human buildings. Their units
  keep the player-coloured garments on a base and their cities are toned,
  as in the study. Only an all-Human match shows a finished look.
- **The interface does not match.** Portraits, train buttons and the dock
  still show the old sprites with whole-garment player colour.
- **The Farm** leaves a 4 px seam between side-by-side Farms, hides part of
  a diagonal Road, and its calm straw tone is applied by the cut script,
  not drawn by the generator.
- **Ships** still show the player on a whole sail. It reads well and no one
  wears it, but it is the one large player-coloured surface left.
- **Seat shapes** are still less pretty than round plates (the last row of
  `base-plates.png` shows all round).
- **Coral and Teal under red-green colour blindness.** Both plates turn a
  dark olive that is also close to the grass, so they are told apart by
  shape alone and are less visible than the Gold and Violet plates
  (`same-unit-phone-zoom-0.75.png`). The darker rim helps; a palette change
  would help more. Unchanged from the study.
- **The ready cue** on the base has not been tried in play.
- **Runtime:** the samples are separate files loaded on demand, and a unit
  or city sample goes through the owner recolour with an empty mask. A
  rollout registers them as production assets without masks.

### Rollout estimate for all factions

This demo used 52 PixelLab calls (about US$0.50): 6 for the three units, 6
for style A and the first style B samples, 4 rejected Pixflux and 1
lineless sample, 28 for the other buildings and cities (most needed a
ground-removal edit; the cities were generated twice, the second time
larger), 2 for the flag comparison, and 5 for the Farm. With the recipes now stable, a building or
city costs about 2.2 calls (one creation, one edit, an occasional retry)
and a unit edit about 1.3.

| Step | Work                                                                                                                                                 | Means                           | PixelLab calls |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------- |
| 1    | Renderer: plates, ship rings, pennant anchors, HP when damaged, ready rim, borders, Roads; drop the toggle. Unit and city subjects lose their masks. | Code, tests, browser smoke      | 0              |
| 2    | Human: accept the 13 building and city samples and the Farm as production assets after per-asset review; redo any that fail it.                      | Pipeline `accept`, a few redos  | about 10       |
| 3    | Human: the other 8 unit sprites and 11 portraits, as edits.                                                                                          | PixelLab edits                  | about 25       |
| 4    | Decide whether improvements become per-faction (new `IMPROVEMENT:<FACTION>:<ID>` subjects). If yes: 10 improvements for each of three factions.      | Code, PixelLab                  | about 65       |
| 5    | Undead, Goblin, Dinosaur: 9 city sprites restyled, 25 unit sprites and 24 portraits moved from player garments to fixed faction colours.             | PixelLab edits, palette choices | about 85       |
| 6    | Art direction and class documents, faction fragments, mask QA rules (no owner area), `art:validate`.                                                 | Docs, pipeline                  | 0              |

About 185 calls (about US$2) with per-faction improvements, about 120
without. As before, review time is the cost that matters: roughly 100
sprites and portraits to look at one by one. Suggested order: 1, 2, 3, 6,
then one faction at a time; until a faction is redone it runs as today's
sprites on a base, which looks consistent, if not finished.

### What the demo produced

- **Runtime (off by default):** `HUMAN_DEMO_DIRECTION_V7`, the plate and
  ship ring, `drawDirectedFlagV7` and its anchors, and sample sprites for
  buildings and cities in
  [`visual-direction-v7.ts`](../../src/render/canvas/visual-direction-v7.ts);
  one hook in `board-renderer-v7.ts` (the pennant, after the sprite); the
  sample sets in
  [`visual-direction-samples-v7.ts`](../../src/render/canvas/visual-direction-samples-v7.ts),
  still imported only when the toggle is on. The test that the baseline
  direction issues the same canvas calls as no direction still holds.
- **Pipeline:** an exploration run may override prompt fragments in its own
  `fragments/` directory, and buildings may be generated with Pixflux (see
  [CHIBI_PIPELINE.md](CHIBI_PIPELINE.md#exploration-runs)).
- **Exploration runs** under
  [`art/explorations/human-demo-2026-10/`](../../art/explorations/human-demo-2026-10/):
  `units/`, `buildings-soft/` (style A), `buildings-flat/` (style B, the
  cities and the Pixflux samples) and `farm/`, each with its `batch.json`
  (recipes, seeds, instructions), `faction.md`, `subjects.json`, `fragments/`,
  `records.json` (requests, job ids and every rejection with its reason),
  `submissions/` and `raw/`. `assets/` holds the cut sprites and
  `samples.json` says which candidate each came from.
- **Cut script:**
  [`scripts/art/visual-direction/demo-samples.ts`](../../scripts/art/visual-direction/demo-samples.ts)
  (no PixelLab call): seats each building at the bottom of its canvas,
  crops the cities, evens the Farm's rows.
- **Test bench:** `npm run art:visual-direction-demo-review`; the scenes
  `DEMO` and `LIVE` in
  [`scene.ts`](../../scripts/art/visual-direction/scene.ts).

### Open questions for the user

1. Is building style B right, or should the buildings be flatter still
   (which means leaving Pixen for buildings), or larger?
2. Are pennants on the cities, the Port and the Shipyard the right set, or
   should improvements carry none at all?
3. Is the Farm what you had in mind: four rows, this density, this colour?
   Should the rows also break where a Road crosses them?
4. Shaped plates, or all round (last row of `base-plates.png`)?
5. Ships: is the player colour on the whole sail acceptable?
6. Should each faction get its own improvement sprites (65 more calls and
   new runtime subjects), or do all factions share one neutral set?
7. Should the three city tiers share one stone (all sandstone, say)?
8. Roll out in the order above?

## 12. Production

**Status:** bead `pulp_wars-3tq.5`. The user reviewed the demo on 2026-10-02
(recorded on `pulp_wars-3tq.4`): the buildings are a clear improvement and
the pattern stays, even if single buildings need iterating (the Sawmill);
the units look good, though telling players apart is hard; go ahead
tentatively with everything: replace the buildings and **all** Human units
in the live game and do the base plates; do **not** replace the other
factions' sprites yet. This section is the art half of that decision. Bead
`pulp_wars-3tq.6` makes it the default rendering; here the default is
unchanged and the developer toggle draws the production art instead of the
exploration samples.

**The other factions are not converted.** Undead, Goblin and Dinosaur units,
cities and portraits are drawn as today (player-coloured garments on a base
plate with the toggle on). Ships are shared and unchanged. The user will play
with the new look and then decide (`pulp_wars-3tq.7`).

![The all-Human Showcase with the toggle on](../../art/pixellab/reviews/chibi-batch-direction-human/showcase-human-desktop-zoom-1.png)

### What was made

Batch [`direction-human`](../../scripts/art/chibi/batches/batch-direction-human.json)
(records in `scripts/art/chibi/records/`, masters under
`public/assets/chibi/`, registry
[`chibi-direction-art-manifest.ts`](../../src/assets/chibi-direction-art-manifest.ts)):
30 assets from 53 recipes, 22 of them imported from the demo's exploration
runs and 31 new PixelLab calls.

| Asset                     | Recipes tried     | Accepted                   | Notes                                                                                              |
| ------------------------- | ----------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| Fighter, Marksman, Knight | 1 each (imported) | the demo's edits           | the style anchor, re-accepted unchanged                                                            |
| Raider, Guard, Juggernaut | 1 each            | first edit                 | cloak, shield and tabard in crimson with gold; props unchanged                                     |
| Captain                   | 2                 | `captain-heraldic-edit-b`  | the first edit drew a nineteenth-century officer; "change only the colours and the flag" kept him  |
| Catapult                  | 2                 | `catapult-heraldic-edit-b` | the first edit rebuilt the frame as a box cart; "change only the cloth" kept the machine           |
| 8 portraits               | 1 each            | first edit                 | edits of the batch-5 portraits                                                                     |
| Windmill, Port, Shipyard  | 1 each (imported) | the demo's                 |                                                                                                    |
| Forge, Workshop, Monument | 2 each (imported) | the demo's ground edits    |                                                                                                    |
| Sawmill                   | 3                 | `sawmill-c-a-edit-2`       | new subject line; the first two had a dark spoked wheel; a third edit made it a solid saw blade    |
| Market                    | 2                 | `market-c-a-edit`          | open stall with goods on the counter; the edit names the goods so they survive the slab removal    |
| Lumber Camp               | 3                 | `lumber-camp-c-a-edit-b`   | pines, log stack, axe in a stump; the first ground edit removed the logs and the axe too           |
| Farm                      | 3 (imported)      | `farm-field-a-edit-2`      | the demo's ears; the new `crop-rows` derivation makes them tile                                    |
| City 1                    | 3 (2 imported)    | `city-1-c-a-edit-2`        | the demo's town with a sandstone tower                                                             |
| City 2                    | 3 (2 imported)    | `city-2-c-a-edit-2`        | the demo's walled town repainted from grey stone to sandstone                                      |
| City 3                    | 6 (3 imported)    | `city-3-d-a-edit-2`        | a new creation: a keep, a church, houses and four towers inside the wall; then ground, then colour |
| Village                   | 3                 | `village-a-edit-b`         | thatched cottages; the first ground edit painted the yard white                                    |

Recipes that worked:

- **Units and portraits:** `edit-image-pixen` on the accepted sprite. Say what
  changes and end with "Keep the …, pose, proportions, thick black outline
  and art style exactly the same". When an edit redesigns the piece, start
  the instruction with "Change only the colours of …" and list what stays.
- **Buildings:** the `calm-building` class with a subject line that puts the
  signature prop first ("one huge round steel circular saw blade …"), the
  addendum "drawn large and fills most of the image", then a ground-removal
  edit that lists every prop to keep. An edit that says "erase only the flat
  ground slab; do not change anything standing on it" keeps small props best.
- **Cities:** generate at 96 x 96, remove the ground, then one repaint edit
  that names the stone and roof colours of the set.

### Rules that are now fixed

1. **Human units and portraits** wear crimson and gold for every player and
   have no owner area and no mask (`fixedColours`).
2. **Improvements** are one shared neutral set in the calm style. The Sawmill
   shows a saw blade and logs, the Market stalls and goods, the Lumber Camp
   pines, logs and an axe.
3. **The Farm** tiles without a seam: the same two ears repeat every 16 px
   along a row and the four rows repeat every 20 px, so a block of Farms is
   one field with even rows across cell boundaries, horizontally and
   vertically. The 9 px gaps lie on the cell's centre line and edges: a
   straight Road through the cell shows fully along the rows and as a dashed
   line across them; a diagonal Road shows through every gap.
4. **Cities** are one set: pale sandstone, cream plaster with dark oak and
   terracotta-red roofs, growing from four cottages round a tower (80 x 80)
   to a walled town (88 x 80) to a walled city full of buildings (96 x 88).
   The canvases are smaller than today's and stay inside the cell.
5. **Pennants** are drawn in code at recorded anchors on City 1–3, the Port
   and the Shipyard (`DIRECTION_FLAG_ANCHORS_V7`).
6. **The Mine** stays part of the Mined Mountain terrain art (grey rock and
   pale timber, no red) and is toned with the terrain; the **Village** is
   re-created in neutral straw and stone.

### Runtime

- [`chibi-direction-art-manifest.ts`](../../src/assets/chibi-direction-art-manifest.ts)
  lists the production art under the same subjects as the default art but
  in its own list, so no default subject gains a variant. The developer
  toggle imports it on demand and resolves it before the default art, on the
  board and in the interface (docks, training cards, technology cards).
- With the toggle off nothing is imported and the frame is drawn exactly as
  before; the test that a baseline direction issues the same canvas calls as
  no direction still holds.
- The exploration sample sets remain only for the study's review benches.

### Evidence

`npm run art:chibi-direction-review` writes
[`art/pixellab/reviews/chibi-batch-direction-human/`](../../art/pixellab/reviews/chibi-batch-direction-human/)
(see [the pipeline document](CHIBI_PIPELINE.md#review-evidence) for the list).

![Every Human unit, today and new, beside the other factions](../../art/pixellab/reviews/chibi-batch-direction-human/units-old-new-1x.png)

![City 1 to 3, today and new, with the pennant](../../art/pixellab/reviews/chibi-batch-direction-human/cities-x4.png)

![A Farm block over Roads, cities and units in the game](../../art/pixellab/reviews/chibi-batch-direction-human/ingame-farms-desktop-zoom-1.png)

### Weak spots left

- **The city set is close, not identical:** City 1 keeps a heavier dark
  outline than City 2 and 3, and City 3's stone is a little more yellow.
- **City roofs are a clear red-orange**, stronger than the improvements'
  dusty terracotta.
- **The Lumber Camp and the Village are small** (about half a tile wide).
- **The Raider's cloak is a brighter red** than the Fighter's surcoat.
- **The Guard's portrait and map sprite show different faces**, as today.
- **The Farm is very regular:** every row is the same two ears. It is calm
  and seamless, but less hand-drawn than the demo's Farm.
- **A Road crossing the rows** is still partly hidden, and a diagonal Road
  shows only between the rows.
- **Four players who all play Human differ only by plate, pennant and
  border.** The user plans a rule of one player per faction per map later.
- **Ships, terrain and the other factions** are not converted.

## 13. Live default

**Status:** bead `pulp_wars-3tq.6`, waiting for the user's play test
(`pulp_wars-3tq.7`). The user's decision (recorded on `pulp_wars-3tq.4`):
replace the buildings and all Human units in the live game and do the base
plates; do not replace the other factions' sprites yet; play, then decide.

A player with no stored preference now gets the direction in the CHIBI art
set. The LEGACY art set is untouched: it is never given a direction.

### What the default look draws

| Piece                                          | Default look                                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Human units and portraits                      | the production art in fixed crimson and gold, for every player                                                  |
| Every land unit, of every faction, and the Egg | a seat-shaped base plate in the player colour under the feet                                                    |
| Ships and the embarked transport               | unchanged art with the player-coloured sail, in a thin round ring                                               |
| Shared improvements, Farm, Village             | the production art, drawn as authored, no player colour                                                         |
| Port, Shipyard                                 | a small code-drawn pennant in the territory owner's colour                                                      |
| Human City 1 to 3                              | the production art with a pennant on the tower: seat shape in cream, gold for the capital (no separate crown)   |
| Seat badge                                     | not drawn, on any unit or city                                                                                  |
| HP bar                                         | only for a damaged unit: a short bar on the plate, green, amber at two thirds or less, red at one third or less |
| Ready cue                                      | a bright rim round the plate (or the ship's ring); no outline glow                                              |
| Territory border                               | one thin solid line with a soft dark casing; a shared border alternates the two colours                         |
| Roads                                          | no black casing                                                                                                 |
| Terrain, resources, Treasure, the Mine         | unchanged art, toned by code (contrast 65% around the ground's mean, softened outlines), once per raster        |

### What is not converted

Undead, Goblin and Dinosaur keep their current art until the user decides
(`pulp_wars-3tq.7`):

- **Units and portraits** keep their player-coloured garments. On the board
  they stand on a plate, lose the seat badge and show the HP bar only when
  damaged, like every unit. Nothing Human reaches them: no crimson recolour,
  no Human portrait in the dock, the training cards or the technology tree.
- **Cities** keep their faction art, their owner recolour and the classic
  capital crown, exactly as the classic look draws them, minus the seat
  badge. They are **not** toned and get **no pennant**. Decided by looking:
  the fallback pennant on a pole in the cell's top-left corner covers the
  Field Defense badge (the "+2" palisade of a fortified city), floats beside
  the art instead of on a tower, and repeats a colour that already fills
  the roofs; the Goblin and Undead cities also have a flag of their own in
  the art. The study's toning (85% saturation and contrast, softened
  outline) is dropped for them too, so that "not converted" means exactly
  the current sprite.
- **Faction markers are unchanged:** Egg countdown chips, growth chevrons,
  Plague and Bitten chips, Grave markers, the faction badge of a stand-in
  sprite, landing markers, Stampede lanes and Kaboom! previews. One
  collision was fixed: the damaged HP bar on the plate was drawn in the last
  five pixels of the cell, where the territory border and the selection
  outline hid most of it (seen on a damaged Egg and on a selected Guard); it
  now sits 3 px higher, inside both.
- **Stand-ins.** A faction unit whose own raster is missing or fails to load
  is still drawn as the Human sprite of its role with the faction badge;
  that stand-in is now the crimson Human direction sprite.
- **Ships, terrain and resources** are not re-created.

### Loading and fallback

- The production art of section 12 is part of the CHIBI set's normal asset
  loading: `src/render/canvas/live-board-look-v7.ts` builds its registry
  with the module, and the board host and the interface resolve it before
  the default art. Nothing is imported on demand any more.
- **No flash of the previous art.** While a direction raster loads, the
  piece is not drawn (like any CHIBI piece), and the interface shows its
  loading placeholder.
- **Per-piece fallback.** A direction raster that fails to load resolves as
  missing, and that piece alone is drawn from its classic asset: a Human
  unit in the faction crimson through its old mask, a building or a Human
  city in the faction's roof colour and toned, a Human city with the corner
  pennant (it has no authored anchor), a portrait or a dock sprite in the
  owner's colour. The rest of the board is unaffected.
- **No per-frame pixel work.** Toned terrain and fallback copies are built
  once per source raster and cached with it; direction art is drawn as
  authored. A frame only issues draw calls.

### The developer option

Settings > Developer tools > **Board look** > "Classic look (previous art)",
off by default, stored in the browser under
`pulpWars.ruleset7.boardClassicLook.v1` as `{"classic": true|false}`. On, the
board is given no direction and the interface resolves the default registry
alone: the frame is the one drawn before the direction existed (a test
keeps that exact). The experiment's key
`pulpWars.ruleset7.boardVisualDirection.v1` is retired: it is never read and
is removed on load. Its `false` meant "the experiment was not switched on",
not "I prefer the previous art", so no value of it turns the classic look
on; someone who had the experiment on, or off, simply gets the default.

The building and city saturation sliders keep working in both looks: the
direction's rasters go through the same cached desaturated copies.

### Runtime

- `LIVE_DIRECTION_V7` in
  [`visual-direction-v7.ts`](../../src/render/canvas/visual-direction-v7.ts)
  is the Human demo's direction with `city.factionCities: "CLASSIC"`.
  `liveBoardLookV7(artSet, classicLook)` in
  [`live-board-look-v7.ts`](../../src/render/canvas/live-board-look-v7.ts)
  returns the two board-host model fields the game passes
  (`visualDirection`, `visualDirectionArt`), or nothing for LEGACY and the
  classic look. The CHIBI review scenes under `scripts/art/chibi/` spread
  the same fields, so review evidence shows what the game draws.
- `createChibiDomArtV7` takes a `preferred` registry, resolved subject by
  subject before the default one and before a faction subject's shared
  stand-in, so an Undead portrait never becomes the Human direction
  portrait (the experiment's toggle had that leak).
- `HUMAN_DEMO_DIRECTION_V7`, `RECOMMENDED_DIRECTION_V7` and the sample sets
  remain for the study's benches only.

### Evidence

`npm run art:chibi-direction-review` now captures the default look
(`showcase-*`, `ingame-farms-*`) and the classic look
(`showcase-human-today-desktop-zoom-1.png`).

### Weak spots for the play test

- **Mixed matches look two-speed.** Human cities and units are in fixed
  colours beside whole-roof and whole-garment player colour on the other
  three factions, and an unconverted city is bolder than a Human one.
- **Other factions' cities carry no seat shape.** Their owner is read from
  the colour and the border alone; the numbered badge is gone.
- **Four Human players** differ only by plate, pennant and border.
- **The plate sits at the very bottom of the cell;** a ready unit's bright
  rim reaches about 2 px into the cell below.
- **The damaged HP bar overlaps the boots** of a unit by a pixel or two, and
  on a garrisoned unit it is short (25 px).
- **Growth chevrons and affliction chips** stay in the left strip, which no
  longer has a bar beside them; they read, but float a little.
- **The Grave marker overlaps the right tip of the plate.**
- **Improvement value pips** are drawn over the lower left of the smaller
  buildings, as they were over the previous ones.
- **The ready cue** on the plate is weaker than the old glow; not yet tried
  in play.
- **Terrain toning** runs once per terrain raster on first use (a few
  milliseconds each); it is not baked by the pipeline yet.

## Sources

- Wargroove, "Palette swapping": <https://wargroove.com/palette-swapping/>
- Joost van Dongen (Ronimo), "Making gameplay stand out against rich
  backgrounds":
  <http://joostdevblog.blogspot.com/2015/05/making-gameplay-stand-out-against-rich.html>
- Blizzard, "Mastering Mapmaking: Part One" (unit readability first):
  <https://news.blizzard.com/en-us/article/20097658/mastering-mapmaking-part-one>
- Age of Empires wiki, "Player" (player colours, outlines, rings under
  units): <https://ageofempires.fandom.com/wiki/Player>
- Age of Empires II: Definitive Edition accessibility (colour-blind modes,
  friend-or-foe colours): <https://www.ageofempires.com/age-ii-de-accessibility/>
- Polytopia wiki, "Tribes" (mirror matches get recoloured copies):
  <https://polytopia.fandom.com/wiki/Tribes>
- TheGamer, Polytopia review (clutter on small maps):
  <https://www.thegamer.com/battle-of-polytopia-review/>
- Civilization VI unit flags: <https://civ6.fandom.com/wiki/Category:Unit_flag_icons>;
  "jersey" colours: <https://forums.civfanatics.com/threads/%E2%80%9Cjersey%E2%80%9Dcolors.642076/>
- Into the Breach, readability of its tiles and markers:
  <https://skullduggery.us/rants/into-the-breach/>
- Game Developer, "How to reduce visual confusion in your game":
  <https://www.gamedeveloper.com/design/how-to-reduce-visual-confusion-in-your-game>
- Purple Pwny Studios, "Visual hierarchy for game developers":
  <http://purplepwny.com/blog/visual_hierarchy_for_game_developers_a_practical_guide_to_making_important_stuff_seem_important.html>
- Tabletop base rings and rim colours for squad identification:
  <https://www.heresy-online.net/threads/do-you-paint-around-the-edge-of-bases.164034/>
- Colour-blindness simulation: Machado, Oliveira and Fernandes, "A
  physiologically-based model for simulation of color vision deficiency"
  (2009).
