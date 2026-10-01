# Visual direction study, October 2026: less clutter, faction colours, player markers

**Status:** exploration for bead `pulp_wars-3tq.1`, waiting for the user's
review (`pulp_wars-3tq.2`). Nothing here changes the production manifest,
the asset registry or what the game draws by default. The
[chibi art direction](CHIBI_ART_DIRECTION.md) still governs production art;
section 6 lists the rules that would change if this direction is approved.

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
- **See it live.** Settings > Developer tools > Visual direction switches a
  real game to the recommended direction (chibi art set; off by default).

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
