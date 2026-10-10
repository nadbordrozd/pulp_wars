# Faction fragment: ICE_FOLK

**Status:** direction chosen and production art made in bead
`pulp_wars-7g3.5` (batch `direction-ice-folk`), **live in the default look
since the Ice Folk UI bead `pulp_wars-7g3.6`** (see
[What the UI bead wired](#what-the-ui-bead-wired)). The user delegated the
look: "pick art direction and implement. I'll
come back when it's done and fix or not." The root proposed "frost and fur"
(warm white fur, slate faces, one glacier ice-blue accent); this bead
measured that proposal and its alternatives in a short study, kept the fur
with a warmer shade and moved the accent to a deeper ice blue. Every
decision below is recorded so that it can be overruled.

The art pipeline reads the two `text` blocks under **Prompt fragment** and
**Negative fragment** below as layer 3 of every Ice Folk prompt, so edit
them here and nowhere else. Recipes that were already generated keep the
request stored in their record (see the
[pipeline](../CHIBI_PIPELINE.md#fragment-changes-and-historical-records));
the first study recipes were made with the root's first fragment.

The rules and roster come from the
[Ice Folk spec](../../product/RULESET_7_ICE_FOLK.md) (sections 3 and 13).
Patrol Boat, Battleship and the embarked transport reuse the shared ship
art.

## Identity

The things from the peaks: shaggy snow apes, ice-age hunters in fur parkas,
a woolly mammoth, a sabre-toothed cat, a Frost Giant and an Ice Witch under
whom the ground is winter. Friendly and calm, never scary; a winter
picture book, not a horror film.

The faction wears **fixed colours**: warm white and cream fur shaded warm
taupe, charcoal slate on the beasts' faces, hands and feet, dark brown-grey
hide and furs, pale ivory bone, and exactly one accent, a deep ice blue. No
sprite has an owner area or a mask. The player is read from the
seat-shaped plate under a unit, the pennant on a city and the territory
border.

## Prompt fragment

It names only a mood, materials, surfaces, colours and small motifs: no
figure and no place or building. ("Beasts" is the one exception: it keeps
the slate skin off the people.)

```text
Faction: ice-age folk of the frozen mountain peaks, calm and friendly. Their
fixed colours: shaggy warm white and cream fur shaded with warm taupe grey,
never blue-grey; dark charcoal slate on the bare faces, hands and feet of
beasts; dark brown-grey hide and furs; pale ivory bone; and exactly one
accent colour, a bright clear ice blue with white highlights, only as small
ice crystals, frost and ice shards.
```

## Negative fragment

Red, gold, orange and fire are the Human, Goblin and Dinosaur colours;
green the Grass and the Goblins; purple, violet, magenta and pink the
Undead and the Martians; metal armour, steel and chrome the Humans and the
Martians. Blue-grey and grey fur are excluded because they are the colour
of the Mountain rock (below).

```text
red, crimson, gold, brass, orange, fire, flames, green, lime, purple,
violet, magenta, pink, blue-grey fur, grey fur, metal armour, steel, chrome,
plate armour, medieval knight, helmet, sword, gun, scary, horror, realistic,
large glowing area
```

## How the direction was chosen

A short study on three units (Yeti, Ice Witch, Mammoth), evidence in
[`study-options-x3.png`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/study-options-x3.png)
and `study.json` (`npx tsx scripts/art/ice-folk-direction/study.ts`).
CIE76 colour difference: about 10 is clear at a glance, 20 and more are
different colours; "worst" is the smallest of normal vision, deuteranopia
and protanopia.

**Before any call**, the root's colours were measured against the
terrain and the colours already taken: glacier ice blue `#8fe3ff` is 12
from Shallow Water and 16 from the Martian glass; a blue-grey fur shade
(`#9aa6bd`) is **6** from the Mountain rock. So the study drew the root's
direction and its alternatives and measured them on real sprites.

**Fur** (three Yeti options, PixelLab edits of one Yeti):

| Option                                    | Lit, shade           | Lit against Grass, rock | Shade against rock | Verdict                                                                                    |
| ----------------------------------------- | -------------------- | ----------------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| F1 warm white, blue-grey shade (`yeti-a`) | `#dbd8c1`, `#747a82` | 44, 26                  | 18                 | rejected: the shade is the rock's hue, and it falls in the accent step's band (turns blue) |
| **F2 warm white, taupe shade**            | `#ddd9c1`, `#8d8273` | 44, 26                  | **22**             | **chosen**                                                                                 |
| F3 honey cream (`yeti-fur-c`)             | `#f1deb6`            | 42, 36                  | 23                 | rejected: reads orange, like a lion; 43 from the Gold plate                                |

All three lit furs have a luminance contrast of only about 1.6 against the
rock: no fur colour pale enough to read as snow fur can be dark against a
grey-white Mountain. What carries a Yeti there is measured below.

**Accent** (three options on the same three units; A1 is what PixelLab
draws, A2 and A3 are deterministic recolours of the same pixels; the edit
`yeti-ice-b` shows that asking PixelLab for a deep ice blue by hex drew a
dark royal blue, `#0813af`):

| Option                            | Lit       | Shallow Water | Teal plate | Martian glass, lit       | Worst of the three | Verdict                  |
| --------------------------------- | --------- | ------------- | ---------- | ------------------------ | ------------------ | ------------------------ |
| A1 glacier ice blue (the root's)  | `#a4f1fa` | 10            | 32         | 14 (2 for a deuteranope) | 2.2                | rejected                 |
| **A2 deep ice blue**              | `#37b1fa` | **38**        | **55**     | **41**                   | **29**             | **chosen**               |
| A3 frost white, blue-violet shade | `#eefdfe` | 25            | 48         | 12                       | 4.5                | rejected: Martian chrome |

A2 against the colours near it: Dinosaur blue `#205794` 36, Deep Water 26,
the Violet plate 45 (13 for a deuteranope), the Undead violet 91.

So: **F2 fur and the A2 accent.** The accent is pinned by a pipeline step
(`ice-folk-blue`, below), because PixelLab draws "ice blue" pale whatever
the prompt says.

## Palette

Measured on the eight unit masters
([`palette.json`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/palette.json)).

| Role                         | Colours                                   | Share | Used for                                                      |
| ---------------------------- | ----------------------------------------- | ----- | ------------------------------------------------------------- |
| Fur and cream, lit           | mean `#e3d5b7`; `#fffbe6`, `#f9e8c6`      | 24%   | Yetis, Mammoth wool, Sabretooth coat, parka hoods             |
| Fur, taupe shade             | mean `#8c7667`; `#aa856e`, `#847072`      | 9%    | the shade of the fur, never blue-grey                         |
| Slate faces, hands and stone | mean `#555c69`; `#4e4e59`, `#2b2e36`      | 10%   | the beasts' faces, hands and feet, the Frost Giant's skin     |
| Dark brown-grey hide         | mean `#493736`; `#594f4d`, `#2d2b2b`      | 6%    | parkas, straps, the Giant's leathers                          |
| Navy                         | mean `#22324f`; `#1c233e`                 | 7%    | the Ice Witch's robe                                          |
| Snow white                   | `#ffffff`, `#fafcf9`                      | 4%    | highlights, frost trim, the Witch's hair                      |
| **Ice blue (accent)**        | lit `#24abfc`; mean `#198de3`; hue 203°   | 8%    | crystals, club, crown, bolas, harpoon tip, the Giant's armour |
| Outline                      | `#000000`                                 | 22%   | the thick outline of the chibi look                           |
| Code-drawn                   | `ICE_FOLK_PALETTE_V7` (below)             | n/a   | Snow overlay, Blizzard, Chill markers, HP window              |
| Effect sprites               | the eight colours of `ice-folk-frost.png` | n/a   | the five effect sprites                                       |

Rules:

- **One accent, pinned by a pipeline step.** The `ice-folk-blue` preset of
  the [pipeline](../CHIBI_PIPELINE.md#the-ice-folk-batch-bead-pulp_wars-7g35)
  finds the drawn ice by colour (hue 175° to 218°, saturation at least 0.2,
  value at least 0.62) and moves it to hue 205° with its saturation raised
  (`min(0.95, s * 1.4 + 0.3)`). Fur, hide, bone, skin and the slate faces
  are below saturation 0.2 or value 0.62; the navy robe is bluer (225° and
  more) and darker. The masters measure the accent at hue 197° to 213°.
- **No red, no key colour.** No master has a pixel in the owner key's band
  (hue 340° to 5°, saturated); a test checks it. The Snow Hunter's and the
  Sled driver's first faces did, and were recoloured to a light golden tan.
- **The accent is on every unit:** from 16 pixels (the Mammoth's frosted
  tusk tips) to the Frost Giant's armour (19% of it, the one large ice
  area, as the Martian Colossus's cannon is the one large magenta area).

## Readability

From [`readability.json`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/readability.json).

| Check                                     | Result                                                                                                                                                                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fur on Mountain rock** (the risk)       | lit fur 29 from the mean rock (`#a2aab6`), 28 from its light tones, 41 from the peaks; shade 27. Different colours, but a luminance contrast of only **1.6**.                                                                                            |
| What carries a Yeti on a Mountain         | the black outline (22% of a unit, contrast **9.5** against the light rock), the charcoal face and hands (31 from the rock, contrast 2.9), the hide (46, contrast 4.7) and the ice accent (40). In the scenes the Yetis on the Mountain row read at once. |
| Fur on Grass and Forest                   | 43 and 41 (28 and 31 for a deuteranope).                                                                                                                                                                                                                 |
| Accent against Shallow Water, Teal, glass | 43, 60, 36 (lit); 51, 67 (mean); never below 33 under either colour-vision deficiency.                                                                                                                                                                   |
| Accent against Dinosaur blue, Deep Water  | 34 and 27: a small light accent against a large dark hide or water.                                                                                                                                                                                      |
| Accent against the Violet plate           | 43, but 16 and 14 under deuteranopia and protanopia.                                                                                                                                                                                                     |
| Fur on the Snow overlay                   | **19** on Snow over Grass (6 for a deuteranope), 22 on Snow over rock; contrast 1.1. An Ice Folk unit on its own Snow is the weakest case: the outline, the slate face (contrast 4.1) and the plate under it carry it.                                   |
| Fur against the Gold plate                | 48.                                                                                                                                                                                                                                                      |
| Sizes                                     | Yeti 52 x 54, Sled 69 x 76, Snow Hunter 53 x 65, Mammoth 53 x 61, Ice Witch 48 x 55, Boulder Yeti 58 x 80, Sabretooth 60 x 49, Frost Giant 80 x 92 (in the canvases of their roles).                                                                     |

## Silhouette language

This guides the subject lines; it is not sent to PixelLab.

- **Shaggy, round, low.** Apes, wool and fur hoods: round tufted outlines
  against the Humans' helmets, the Undead's hoods and the Martians' domes.
- **Apes are one family.** Yeti and Boulder Yeti share fur, a charcoal
  face with small fangs and big slate hands; the Boulder Yeti is bigger
  (the `CATAPULT` canvas) with its arms up under a blue boulder.
- **People wear hoods.** The Snow Hunter and the Sled driver have tan faces
  in cream fur hoods and dark brown-grey parkas; the Ice Witch has no hood
  and no hat, only white hair and an ice crown.
- **Ice is the accent and the tell:** a crystal on every piece, never a
  whole blue garment.

## Roster

Batch [`direction-ice-folk`](../../../scripts/art/chibi/batches/batch-direction-ice-folk.json),
subject lines in
[`subjects/ICE_FOLK.json`](../../../scripts/art/chibi/subjects/ICE_FOLK.json).
The canvas follows the mechanical role, as for every faction.

| Unit (role)                | Canvas   | Sprite   | Accepted recipe           | What it shows, and how its job reads                                                                        |
| -------------------------- | -------- | -------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Yeti (`FIGHTER`)           | 56 x 80  | 52 x 54  | `yeti-fur-b`              | a broad white snow ape with a charcoal face and an ice-crusted bone club: the plain soldier, clearly an ape |
| Sled (`RAIDER`)            | 72 x 88  | 69 x 76  | `sled-a`                  | two grey-and-white huskies, an ivory sled and a hooded driver whirling a bolas with two ice weights         |
| Snow Hunter (`MARKSMAN`)   | 56 x 80  | 53 x 65  | `snow-hunter-a-skin-hair` | a lean hooded hunter with an ivory harpoon tipped with an ice crystal: the human-sized one                  |
| Mammoth (`GUARD`)          | 56 x 80  | 53 x 61  | `mammoth-a-edit`          | a woolly mammoth in side view: cream-to-tan wool, charcoal face and trunk, long ivory tusks with frost tips |
| Ice Witch (`CAPTAIN`)      | 56 x 80  | 48 x 55  | `ice-witch-c`             | pale face, white hair, a tall ice crown, navy robe with white fur, a staff with an ice crystal              |
| Boulder Yeti (`CATAPULT`)  | 72 x 88  | 58 x 80  | `boulder-yeti-a-edit`     | a bigger Yeti lifting an ice-crusted boulder over its head                                                  |
| Sabretooth (`KNIGHT`)      | 72 x 88  | 60 x 49  | `sabretooth-a-edit-frost` | a pale snow-leopard cat in mid-prowl, two long ivory fangs, ice-blue eyes and frost on its back             |
| Frost Giant (`JUGGERNAUT`) | 88 x 104 | 80 x 92  | `frost-giant-a-edit`      | a towering slate-stone giant in ice armour with an ice axe and a frosty white beard                         |
| Patrol Boat, Battleship    | shared   | (shared) | (unchanged)               | the shared ships with the player-coloured sail                                                              |

Each unit has a 48 x 48 portrait (`chibi-direction-portrait-ice-folk-<unit>`):
busts for the Yeti, the Snow Hunter, the Ice Witch, the Boulder Yeti, the
Sled driver (with his husky), the Frost Giant and the Sabretooth's head;
the Mammoth is a whole small mammoth.

How they were made (72 PixelLab calls in all, 43 creations and 29 edits;
38 recipes are rejected with a recorded reason):

- **Units are fresh creations,** with colour edits where PixelLab drifted:
  the Mammoth's orange trunk and brown lower wool, the Boulder Yeti's brown
  bear coat, the Sabretooth's tan and brown patches (and then its frost),
  the Frost Giant's blond beard, the Snow Hunter's red face and fringe. The
  Sled is the `machine` class (a vehicle, not one figure); the Mammoth and
  the Sabretooth use the side view of the Dinosaur quadrupeds.
- **The Ice Witch** is a creation with the final fragment: the first one,
  made with the root's fragment, got its "slate skin".
- **Portraits** of beasts came out as whole small figures; a "zoom in to a
  close-up" edit made the busts, and the Boulder Yeti's portrait is a
  sibling edit of the Yeti's.

## Cities

An ice-age camp growing into an igloo town, in the direction's calm
building style (`calm-settlement`, subject keys `CITY:ICE_FOLK:<level>/CALM`),
on the canvases of the Undead direction cities. No part takes a player
colour; each level has a bone pole of its own for the code-drawn pennant.

| Level | Asset                             | Canvas  | What it shows                                                                | Pennant anchor (`ICE_FOLK_FLAG_ANCHORS_V7`) |
| ----- | --------------------------------- | ------- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| 1     | `chibi-direction-ice-folk-city-1` | 80 x 80 | a snow-block igloo, a cream hide cone tent, two ice blocks, a tall bone pole | `{ x: 64.5, y: 22, pole: 0 }`               |
| 2     | `chibi-direction-ice-folk-city-2` | 88 x 88 | two igloos and a long hall with a cream hide roof inside a snow-block wall   | `{ x: 79.5, y: 39, pole: 0 }`               |
| 3     | `chibi-direction-ice-folk-city-3` | 96 x 88 | a domed great hall with two ice towers in a ring of igloos                   | `{ x: 75, y: 26, pole: 0 }`                 |

The anchor is the top of the pole, in master pixels from the sprite's
top-left corner. Each city is a creation at 96 x 96 and one edit that
removes the grass slab (City 2's also darkened its orange doorways).

## Icons

48 x 48, made with the `icon` class like the existing action icons.

| Subject                            | Asset                                     | What it shows                                     |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| `ICON:ACTION:THROW_BOLAS`          | `chibi-direction-icon-action-throw-bolas` | two ice weights on a cream cord                   |
| `ICON:ACTION:COLD_SNAP`            | `chibi-direction-icon-action-cold-snap`   | an ice snowflake in a ring of shards              |
| `ICON:ACTION:SHATTER`              | `chibi-direction-icon-action-shatter`     | ice bursting into shards round a white flash      |
| `ICON:ACTION:SWEEP`                | `chibi-direction-icon-action-sweep`       | a mammoth's tusk swinging with a white swoosh     |
| `ICON:ACTION:ROCKFALL`             | `chibi-direction-icon-action-rockfall`    | an icy rock flying off a small snowy peak         |
| `ICON:ACTION:PROWL`                | `chibi-direction-icon-action-prowl`       | a trail of big cat paw prints                     |
| `ICON:TECH:ICE_FOLK:FORTIFICATION` | `chibi-direction-icon-tech-deep-winter`   | Deep Winter: an igloo with snow spreading from it |
| `ICON:TECH:ICE_FOLK:EXPLOSIVES`    | `chibi-direction-icon-tech-brittle`       | Brittle: an ice cube split by zigzag cracks       |
| `ICON:STATUS:CHILLED`              | `chibi-direction-icon-status-chilled`     | the frost glyph: one symmetrical ice snowflake    |
| `ICON:STATUS:FROZEN`               | `chibi-direction-icon-status-frozen`      | a cube of clear ice with icicles                  |

`ICON:ACTION:THROW_BOLAS` and `ICON:ACTION:COLD_SNAP` are the subjects of
the two new command kinds; the Ice Folk subject type lists them by name
until the engine adds the kinds. Charge (Sled) keeps the Raider's icon.

## Ability effects

Five sprites in the format of the Undead and Martian effects (`effect`
class, mapped to the eight colours of
[`ice-folk-frost.png`](../../../scripts/art/chibi/palettes/ice-folk-frost.png):
outline `#0e1c30`, deep ice `#145a9c`, ice blue `#2f9be8`, light ice
`#7fcbff`, frost `#d6f0ff`, white, slate `#5b6577`, ivory `#e8dcc2`).

| Subject                 | Asset (`chibi-direction-effect-ice-folk-…`) | Size    | Use                                                                    |
| ----------------------- | ------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `EFFECT:SHATTER`        | `shatter`                                   | 48 x 48 | the burst: sharp shards flying out from a white flash                  |
| `EFFECT:SHATTER_SHARDS` | `shatter-shards`                            | 48 x 48 | the loose shards that fly out, fall and melt                           |
| `EFFECT:COLD_SNAP`      | `cold-snap`                                 | 48 x 48 | a ring of ice points with an empty middle, scaled out to two tiles     |
| `EFFECT:BOLAS`          | `bolas`                                     | 40 x 40 | the thrown bolas, spinning along its arc from the Sled                 |
| `EFFECT:FROST_HIT`      | `frost-hit`                                 | 40 x 40 | frost forming on a unit as it is chilled (Bolas, Cold Snap, Cold Aura) |

**The Shatter** is the faction's "wow" moment, so it has a timeline
(`ICE_FOLK_SHATTER_TIMELINE_V7`, frames in
[`shatter-frames-x3.png`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/shatter-frames-x3.png)):
0 to 140 ms the victim is cased in ice to the top
(`iceFolkFrozenCasingV7` with `heightShare` 1); 140 to 220 ms three white
cracks run over the casing and the sprite shakes by 1 px; at 220 ms the
sprite is gone and the burst plays at its centre (scale 0.7 to 1.25, alpha
1 to 0.5, to 520 ms); from 300 to 950 ms the shards spread (scale 1 to
1.7), fall 8 px and fade. No body, no Grave, no death blast, which is what
tells a Shatter from an ordinary death.

## Code-drawn pieces

The spec makes these code-drawn. The colours and the pure drawing
functions are in
[`chibi-direction-ice-folk-presentation.ts`](../../../src/assets/chibi-direction-ice-folk-presentation.ts),
which imports nothing: the same bytes in the game, the review and the
tests. Rasters were considered for the Snow overlay and rejected: a snow
texture would hide which tile is Grass, Forest or Mountain, and it would
need 16 edge variants per terrain to end cleanly at a territory edge; a
wash computed per edge set does both.

`ICE_FOLK_PALETTE_V7`: ice `#37b1fa`, ice glow `#7fcbff`, ice pale
`#d6f0ff`, ice dark `#145a9c`, outline `#0e1c30`, snow `#f5f8fc`, snow shade
`#bccbdd`, snow rim `#9aaec7`, fur `#ddd9c1`, fur shade `#8d8273`, slate
`#3b4352`, navy `#1b2552`.

### Snow overlay

`iceFolkSnowTileV7(edges, variant)` returns an 80 x 80 RGBA tile;
`iceFolkSnowVariantV7(at)` picks one of four variants per cell. Draw it on
every explored land tile whose view flag `snow` is true, **over the
terrain ground and under Roads, improvements, resources, tall terrain
bodies, cities and units**; build each (edges, variant) tile once and
cache it (64 tiles at most), as the Mountain fringe does.

- **Wash:** snow white at 42% alpha. Grass becomes a pale sage white (27
  from Grass), Forest ground white under green trees, Mountain rock a
  lighter grey (13 from the rock: the caps and drifts carry it there).
- **Drifts and sparkle:** three low white lenses with a blue-grey shade
  line and ten single sparkle pixels per tile, at hashed positions at least
  7 px from the edges. Every border pixel is the plain wash, so a field of
  Snow has no seam (a test checks it).
- **Edges:** where a neighbour is not Snow (a territory edge, water, an
  unexplored cell) the wash is cut 2 to 5 px inside the edge on a smooth
  ragged profile that meets itself at the cell corners, with a 1 px
  `snowRim` bank. Neighbouring Snow tiles are never cut.
- **Tall terrain:** `iceFolkSnowCapsV7(body)` returns snow caps (the top 3
  opaque rows of each shape, 85% white, outline pixels kept) to draw over
  a tree or peak body on a Snow cell, after the body.
- Roads stay on top and readable; a city's territory border is drawn over
  the cut edge as today.

Evidence:
[`snow-tiles-x2.png`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/snow-tiles-x2.png)
(every edge set on Grass and rock, and a 6 x 3 field),
[`terrain-x2.png`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/terrain-x2.png)
and the board mock
[`snow-board-zoom-1.png`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/snow-board-zoom-1.png).

### Blizzard

`ICE_FOLK_BLIZZARD_V7` and `iceFolkBlizzardFlakesV7(at, timeMs)`: on every
explored tile whose flag `blizzard` is true, water included, a 8% white
veil and nine falling flakes per tile (1 px dots and 2 px flakes with a
shade pixel; 14 px/s down, 5 px/s to the left, a 2 px sway; deterministic
by cell and time, so a paused or reduced-motion frame is stable; time 0
for reduced motion). Over the Snow overlay and the terrain, under the
plates and units. The selected or hovered Witch adds the outline of her
nine tiles: a 2 px white dashed line (6 on, 4 off) at 55%, inset 3 px,
corner radius 10. Calm, not a storm.

### Chill markers

`ICE_FOLK_CHILL_MARKER_V7`, on units of any owner
([`markers-x3.png`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/markers-x3.png)
shows them on six factions' units):

- **Frozen** (`sluggish`): `iceFolkFrozenCasingV7(sprite)` returns the
  unit cased in ice to the waist: the silhouette widened by 2 px from the
  feet up to 45% of the sprite's height, filled ice glow at 50%, a pale
  rim along its top and sides, an ice-dark outline and two white glints.
  Draw it over the sprite at the sprite's position minus the 3 px margin.
  Heavy on purpose: "slow this turn".
- **Frosted** (Chilled, not sluggish): a 2 px ice-pale rime on the top
  edges of the sprite (`iceFolkSnowCapsV7(sprite, { depth: 2, colour:
icePale, alpha: 0.85 })`) and the `ICON:STATUS:CHILLED` glyph at 16 px in
  the status slot (the Plague and Bitten slot). Light: "can be shattered".
- **Thawing:** nothing on the board.
- **Shatter window on the HP bar:** while an Ice Folk seat is in the match,
  the lowest {threshold} HP of a Chilled unit's bar are drawn in
  `#7fcbff` with a 1 px white divider (`shatterWindow`).
- **Cold Aura pulse:** the `FROST_HIT` sprite on each chilled neighbour and
  a 200 ms ice-glow flash over the Giant's eight tiles; **Cold Snap:** the
  `COLD_SNAP` ring scaled from the Witch's tile out to five tiles across
  over 450 ms, then `FROST_HIT` on each target.

## What the UI bead wired

`pulp_wars-7g3.6` did each step (the faction was in the engine by then);
the list stays as the record of what the wiring is.

1. **Done.** Add `...CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7` to
   `chibiDirectionArtRegistryV7`
   ([`chibi-direction-art-manifest.ts`](../../../src/assets/chibi-direction-art-manifest.ts)).
   The subjects exist (`IceFolkArtSubjectV7` in
   [`chibi-art-v7.ts`](../../../src/assets/chibi-art-v7.ts)).
2. **Done.** Resolve them: `unitArtSubjectV7` for an `ICE_FOLK` unit
   (`UNIT:ICE_FOLK:<ROLE>`), `cityArtSubjectV7` and `CityArtFactionV7` for
   an Ice Folk city, the fallback of `chibiFallbackSubjectV7` (Human art
   with the Ice Folk badge; Deep Winter and Brittle fall back to the Human
   Fortification and Explosives art), and the portrait, icon and
   technology-icon lookups of the DOM art hook
   (`ICON:TECH:ICE_FOLK:FORTIFICATION` for Deep Winter, `…:EXPLOSIVES` for
   Brittle, by the viewer's faction).
3. **Done.** Copy `ICE_FOLK_FLAG_ANCHORS_V7` into `DIRECTION_FLAG_ANCHORS_V7`.
4. **Done.** Draw the Snow overlay, the snow caps, the Blizzard and the
   Witch's outline, the Frozen and Frosted markers and the HP Shatter window
   from the presentation module
   ([`ice-folk-canvas-v7.ts`](../../../src/render/canvas/ice-folk-canvas-v7.ts)),
   and play the effect sprites (the Shatter timeline, Cold Snap, Bolas,
   frost on hit) through the effects canvas
   ([`ice-folk-effects-v7.ts`](../../../src/render/canvas/ice-folk-effects-v7.ts)).
5. **Done.** Turn round the test "is not wired into the game yet" of
   `tests/unit/chibi-ice-folk-direction-assets.test.ts`, which now checks
   that the live direction registry holds every Ice Folk asset, and only
   it.

### Decisions of the UI bead

Made in `pulp_wars-7g3.6` and recorded so that they can be overruled:

1. **Classic look and LEGACY.** The Ice Folk have no classic art, so both
   draw the Human sprite of the role with a code-drawn badge in the corner
   every earlier faction's badge uses, and the Human city; boats wear it
   too (spec 13.4). **The badge is a snow-capped peak**, an ice-blue peak
   with a white cap on a navy disc with a pale ice rim, **not a snowflake**:
   the Frosted marker is a snowflake glyph on the other side of the unit,
   and the two must not be confused. The DOM uses the same peak
   (`ice-peak`), as blue ink on a pale fill like the Ice Folk chips
   ([interface style](../../ui/STYLE.md)). Snow, the Blizzard and every marker are code-drawn in
   both looks; LEGACY caps its raised Forest and Mountain bodies too.
2. **Snow under the bodies.** On a Snow cell a Forest or Mountain is drawn
   like one under a Road: its ground, then the Snow, then the body (after
   the Roads) with its snow caps, in the body's cell and in its overflow. So
   the Snow whitens the ground between the trees and peaks and never the
   trees themselves, and the caps say "Snow" on a peak, where the wash is
   subtle. The board's edge is not a Snow edge (no cut there, as the
   Mountain fringe keeps straight edges at the board's edge).
3. **The Blizzard moves calmly**, at about fifteen redraws a second while it
   is in view (no redraw at all for reduced motion, which shows time 0); the
   flakes are drawn in the ground pass, so a tree or a peak may hide some.
4. **The frost glyph** takes the next status slot after the Plague and
   Bitten markers (a third slot exists for it); Frozen shows only its
   casing (heavy on purpose), Thawing nothing.
5. **The Shatter window is on every Chilled unit's HP bar, and a Chilled
   unit always shows its HP bar**, also at full HP in the default look,
   whose base bar otherwise shows only when damaged: the window says how
   close the unit is to shattering, which is the point of the marker. The
   threshold is the highest of the hostile Ice Folk seats, as far as the
   viewer knows it (its own technologies, else the public stats of their
   visible units, else 3). A `JUGGERNAUT`-role unit, which never shatters,
   has no window.
6. **The Shatter keeps its defender on the board** after the hit (the hit
   step is held), cased to the top with cracks and a 1 px shake, then the
   board shows the result and the burst and shards play over it, as the
   timeline says. Reduced motion shows the burst frame only.
7. **Preview texts follow the spec's table (13.2)**: "Shatters" (not
   "Shatters!"), "Chilled" on the defender, "Planted: +1 Attack". The
   Shatter label replaces the damage line ("Shatters", plus "sweep N" for a
   Mammoth), and the flank victims are drawn only on the focused (or only)
   attack target, so a row of Mammoth targets stays calm.
8. **Cold Snap is cast from any highlighted target** as well as from its
   one "Cast" button (every target carries the same command), and its
   two-tile reach is tinted with an outer dashed edge. Bolas choices name
   the target's HP, so two targets of one kind are told apart.
9. **City panel**: an Ice Folk viewer's city counts slots and every train
   card names "1 slot", as spec 13.1 asks, though every Ice Folk unit takes
   one.

## Evidence

`npm run art:chibi-ice-folk-direction-review` writes
[`art/pixellab/reviews/chibi-batch-direction-ice-folk/`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/)
(see the [pipeline document](../CHIBI_PIPELINE.md#the-ice-folk-batch-bead-pulp_wars-7g35)).

![The roster on Grass, rock and Snow beside the other five factions' unit of each role](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/roster-x4.png)

![Four Ice Folk players: the roster on Grass, Forest and Mountain, beside water, and a city of each tier](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/scene-four-desktop-zoom-1.png)

![Ice Folk against Human, Undead and Dinosaur](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/scene-mixed-a-desktop-zoom-1.png)

![The Snow overlay over an Ice Folk territory and a Blizzard on Human land (board mock)](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/snow-board-zoom-1.png)

## Decisions

Decided in bead `pulp_wars-7g3.5` under the user's delegation:

1. **Look:** "frost and fur", the root's proposal, with two changes made by
   measurement: a warm taupe fur shade instead of blue-grey, and a deep
   ice blue (hue 203°, lit `#24abfc` on the masters) instead of the pale
   glacier ice blue.
2. **Accent pinned by `ice-folk-blue`,** with a saturation step added to the
   accent mechanism for it.
3. **Skin:** charcoal slate for the beasts; light golden tan for the
   hunters; pale cream for the Witch.
4. **Mammoth:** no rider; side view, filling the 56 px `GUARD` canvas (the
   role's canvas binds it; the spec's "wide rather than tall" is met inside
   it: 53 x 61).
5. **Boulder Yeti:** the Yeti family's fur, not a darker coat. The spec
   asks for "a larger, darker Yeti"; the first creation was a brown, bear
   like coat outside the faction's colours, so it is told from the Yeti by
   size (the `CATAPULT` canvas, 80 px tall against 54), the raised arms and
   the blue boulder instead.
6. **Frost Giant:** slate stone skin, not blue skin: a blue skin would fall
   in the accent's band and fight the ice armour.
7. **Sabretooth:** riderless snow-leopard cat with frost on its back.
8. **Cities:** an igloo camp to an igloo town with a bone pole for the
   pennant, calm style, the Undead direction canvases.
9. **Snow, Blizzard and Chill markers are code-drawn** from pure functions;
   no raster tile set.
10. **Status and technology icons** use the families `ICON:STATUS:*` (the
    Martian precedent) and `ICON:TECH:ICE_FOLK:*`.
11. **Not registered** by this bead: the module was imported only by the
    review scenes until `pulp_wars-7g3.6` registered it (see
    [What the UI bead wired](#what-the-ui-bead-wired)).

## Weak spots

- **Pale fur on pale ground.** On Mountain rock the fur differs by about 28
  but its luminance contrast is 1.6; on the Snow overlay over Grass by 19
  (6 for a deuteranope). The outline, the charcoal faces and the plate
  carry the unit; in the scenes it reads, but it is the faction's weakest
  case.
- **Snow on Mountain is subtle** (the wash is 13 from the rock); the snow
  caps on the peaks carry it.
- **The accent step catches a few lit tones of the slate faces,** which
  turn a little bluer: the Yeti's mouth and the Sabretooth portrait's
  cheeks have blue pixels.
- **The Boulder Yeti is not darker** than the Yeti (decision 5).
- **The Frost Giant wears brown leathers** and reads a little like an
  armoured dwarf at x4; its portrait's beard is ice blue where the map
  sprite's is white.
- **Portraits:** the Mammoth's is a whole small mammoth, not a bust; the
  Sled driver's recoloured mouth is a dark smudge.
- **The Bolas icon** can read as a pair of cherries at 24 px.
- **Brittle and Frozen** are both ice cubes (cracked against icicled); they
  appear on different surfaces (technology card and status line).
- **City 2 has no ice** (an edit that added it turned the whole village
  blue and was rejected), and City 3 is a flat, sparse ring of igloos
  beside the other factions' crowded capitals.
- **The Martian test's list of accent presets** now names `ice-folk-blue`.
- **The review scenes of this bead use stand-in factions,** and the Snow
  overlay and the Blizzard are shown in a board mock (approximate plates,
  Roads and borders). Since `pulp_wars-7g3.6` the renderer draws them; its
  evidence is the Ice Folk UI review (`npm run review:ruleset7-ice-folk-ui`).

## Ninth unit: the Musk Ox (beads `pulp_wars-w49.17` and `pulp_wars-2yc.34`)

Ruleset `7r55` gives every faction a ninth land unit ([what was
built](../../product/RULESET_7_NINTH_UNIT.md)). The Ice Folk one is the
**Musk Ox** (engine role `GUARD`), the defender. It was drawn as the Mammoth
under a steel disc lettered **X** until bead `pulp_wars-2yc.34` gave it its
own art.

- **Art slot.** `UNIT:ICE_FOLK:SWORDSMAN` and `PORTRAIT:ICE_FOLK:SWORDSMAN`,
  the ninth art slot of the faction (`unitArtRoleV7` in
  `src/assets/chibi-art-v7.ts`): `chibi-direction-ice-folk-musk-ox` (56 x 80,
  `STANDARD_UNIT`) and `chibi-direction-portrait-ice-folk-musk-ox` (48 x 48),
  fixed colours, no mask, accent `ice-folk-blue`. Recipes `musk-ox-*` and
  `portrait-musk-ox-a` in batch `direction-ice-folk`; 4 PixelLab calls: three
  fresh creations and one rejected relight.
- **Sprite** (`musk-ox-b`, 54 x 53 px): a low wide body under a skirt of dark
  brown wool with a paler mane and a rust-brown saddle patch, a slate muzzle
  held low, and two thick horns that curl down beside the cheeks, coated in
  ice-blue frost (the Frostbite). A fresh creation in the side view the Mammoth
  uses.
- **Dark wool, not cream.** The first description made it cream-furred. The
  Mammoth and the Yeti are cream, and a cream ox was a small Mammoth; the dark
  brown-grey of the faction's hides sets it apart at a glance.
- **Told apart at board size:** the Mammoth (53 x 61) is cream with a trunk
  and long tusks; the Yeti stands upright; the Sabretooth is pale and long; the
  Musk Ox is the only dark one, lower than the Mammoth, with blue horns.
- **Portrait** (`portrait-musk-ox-a`): the shaggy dark head and shoulders with
  the paler mane, the slate muzzle and the two frost-blue horns.
- **Light.** `lighting-qa` reads the sprite -16.3 and the portrait -21.9: the
  pale mane and the frosted horns are at the head, on the right, and the dark
  rump is on the left. This is local colour more than shading, but the sprite
  has no clear lit left side either. One relight was tried and rejected (below),
  so this stays a known deviation.
- **Rejected.** `musk-ox-a`: a tall bison seen from the front with a cream
  mane, 65 px high (taller than the Mammoth) with horns that point up.
  `musk-ox-b-light`, an edit asked to light the rump and back from the left:
  it turned the whole skirt of wool light tan, the Mammoth's colour, and the
  face near-black, so the ox lost the dark coat that sets it apart.
- LEGACY (`?art=legacy`) and the developer option "Classic look" have no Musk
  Ox art: there it falls back like every faction subject, to the Human unit of
  the slot under the Ice Folk badge.

The Mammoth is the heavy line role now (`SWORDSMAN`); its rasters, prompts and
generation records stay under the art slot they were made for,
`UNIT:ICE_FOLK:GUARD` and `PORTRAIT:ICE_FOLK:GUARD`.

## Forest, Lumber Camp and Sawmill (bead `pulp_wars-2yc.38`)

- **The forest is a tundra forest now**: stunted dwarf firs under thick snow, leaning white birches, crooked gold-brown larches, frosted shrubs and lichen rocks (recipes `tundra-a` and `tundra-b`, five clumps). It is drawn with its snow, so the board puts no `iceFolkSnowCapsV7` caps on it (they still cap every other tree and peak on Snow); the shade under it is a cold blue-slate.
- **Lumber Camp** (`chibi-ice-folk-lumber-camp`, `lumber-camp-a` candidate 0): two snow-capped dwarf firs, a cream hide tent on bone poles, a stack of pale birch logs and a stump with an ice-blue axe, four pieces standing apart.
- **Sawmill** (`chibi-ice-folk-sawmill`, `sawmill-a` candidate 3): a pale timber cabin under a thick snow roof, a round toothed blade of ice blue on a timber bench, and a log on a small hoist. The ice blue is the faction's one accent.

Records: [faction forests](../FACTION_FORESTS.md) and [faction buildings, section 12](../FACTION_BUILDINGS.md#12-a-lumber-camp-and-a-sawmill-per-faction-bead-pulp_wars-2yc38). Both buildings keep the names "Lumber camp" and "Sawmill", are drawn by the owner of the territory they stand in, and fall back to the shared pair in the Classic look and the LEGACY art set.

## Forge, Workshop, Port and Shipyard (bead `pulp_wars-2yc.38`, stage 2)

- **Forge** (`chibi-ice-folk-forge`, `forge-a` candidate 2): an igloo of snow blocks with an orange fire glow in its mouth, a grey stone chimney with smoke, a stone anvil with an ice-blue hammer.
- **Workshop** (`chibi-ice-folk-workshop`, `workshop-a` candidate 0): a tall pale timber hut under a thick snow roof, a pale cogwheel on the gable, a workbench with a block of ice being carved.
- **Port** (`chibi-ice-folk-port`, `port-a` candidate 0): a pier of pale timber dusted with snow, an igloo on it, a bone rack with hanging fish, a rope coil; no boat.
- **Shipyard** (`chibi-ice-folk-shipyard`, `shipyard-a` candidate 13): a timber shed under a thick snow roof, a dog sled on a plank slipway at its door, a block of ice-blue ice; no boat.

The Ice Folk have no ships and never embark, but they build both docks (a Port keeps its population, Fish and sea trade, and upgrades to a Shipyard), so neither piece shows a boat.

Record: [faction buildings, section 13](../FACTION_BUILDINGS.md#13-a-forge-a-workshop-a-port-and-a-shipyard-per-faction-bead-pulp_wars-2yc38-stage-2). Names unchanged; drawn by the owner of the territory; the shared four in the Classic look and the LEGACY art set.

## Market (bead `pulp_wars-eu3r.1`)

- **Market** (`chibi-ice-folk-market`, `market-a` candidate 2): two pale timber stalls under snow-heaped cream hide awnings, rows of silver fish and blocks of ice-blue ice, a small sled of sacks.

Record: [faction buildings, section 14](../FACTION_BUILDINGS.md#14-a-market-per-faction-bead-pulp_wars-eu3r1). Name unchanged; drawn by the owner of the territory; the shared Market in the Classic look and the LEGACY art set.

## Monuments (bead `pulp_wars-eu3r.2`)

The seven achievement Monuments and the faction obelisk in Ice Folk materials. Pale grey stone, white snow, ivory bone and one ice blue (`chibi-ice-folk-monument-<achievement>`): the Explorer a snow-capped obelisk with a bone compass rose; the Engineer a snowy pillar under a bone cogwheel; the Muster a snowy pillar with a timber and a hide shield and a tusk horn at its foot; the Conqueror an arch of snow blocks with an ice-crystal wreath; the Land Baron a boundary stone with a mammoth shield and an ice-crystal crown; the Sea Dog a snowy column with a bone anchor and a bone wheel (the anchor stays: their Sea Dog counts units on ice); the Slayer an ice-blade sword with a fur-lined helmet. **Obelisk** (`chibi-ice-folk-monument`): a clear ice-blue obelisk, candidate 9 of the Explorer sheet reused (no new PixelLab job). Art only: the board still draws the Human (achievement) Monument or the shared obelisk until bead `pulp_wars-eu3r.3` wires the skin rule.

Record: [faction buildings, section 15](../FACTION_BUILDINGS.md#15-faction-monuments-bead-pulp_wars-eu3r2).

## The frozen-sea icons (bead `pulp_wars-5ti.10`)

The Freeze button and the five cards of the Ice Folk Naval branch showed a
code glyph and stand-ins of other ice art. Six icons of their own, 48 x 48,
`icon` class, accent `ice-folk-blue`, in batch `direction-ice-folk`:

| Subject                                | Asset                                 | What it shows                                                         |
| -------------------------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `ICON:ACTION:FREEZE`                   | `chibi-direction-icon-action-freeze`  | a curling sea wave frozen solid, icicles on its crest                 |
| `ICON:TECH:ICE_FOLK:SHORECRAFT`        | `chibi-direction-icon-tech-rime`      | Rime: a fur-topped hide boot on a blade of ice (the slide)            |
| `ICON:TECH:ICE_FOLK:NAVIGATION`        | `chibi-direction-icon-tech-pack-ice`  | Pack Ice: a pointed iceberg with a snow cap and a floe                |
| `ICON:TECH:ICE_FOLK:NAVAL_ENGINEERING` | `chibi-direction-icon-tech-icebound`  | Icebound: a small timber hull gripped by jagged ice                   |
| `ICON:TECH:ICE_FOLK:SEAMANSHIP`        | `chibi-direction-icon-tech-black-ice` | Black Ice: a round slab of near-black ice ringed by bright ice spikes |
| `ICON:TECH:ICE_FOLK:SUBMERSIBLES`      | `chibi-direction-icon-tech-glacier`   | Glacier: a wall of ice under a snow cap with a cave at its foot       |

- **Told apart by shape and tone**, at 18 px on the cream plate: a wave, a
  boot, a triangle, a tan hull in a blue nest, a dark disc, a white-capped
  block with a dark arch. None is a snowflake (Frosted, Cold Snap) or a
  plain cube (Frozen, Brittle).
  [`frozen-sea-icons.png`](../../../art/pixellab/reviews/chibi-batch-direction-ice-folk/frozen-sea-icons.png)
  shows them at x4, 48, 24 and 18 px on the cream plate and the technology
  card's tone, beside those icons and the other factions' Naval icons
  (`npm run art:chibi-ice-folk-direction-review -- --frozen-sea-icons-only`).
- **Twelve PixelLab calls** (seeds 76001 to 76053), six accepted. Pack Ice
  and Icebound were first creations.
- **The faction layer's beasts walk into an icon.** Both Freeze creations
  drew a yeti (in a ball of water, then under the wave), the second although
  its line forbade every living thing; "Erase the furry animal completely
  ... the wave continues down to the bottom of the image" as an edit left
  the wave alone (as the Bolas icon was rescued).
- **Rejected.** Rime's first boot was chestnut orange leather (recoloured to
  the faction's dark hide and cream fur by an edit with hex values). Black
  Ice's first slab carried a cream cup with a key-red thing in it (erased by
  an edit that names what stays). Glacier's first was an outline-less blue
  lump like a tree stump; its third had purple shading and marks that read
  as letters.
- **Weak spots.** The Glacier fills its canvas with no margin, so it is
  drawn larger than its neighbours; at 18 px it is a blue block, told from
  the Frozen cube by its white cap and dark arch. The Rime boot keeps a
  small rust-brown heel. The wave says "sea" before it says "ice" at 18 px;
  its icicles read from 24 px up.
