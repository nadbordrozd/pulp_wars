# Faction grass (experiment)

**Bead:** `pulp_wars-2o7.4`. **Status:** an experiment, on by default, built
to be switched off or reverted.

**A ground need not be grass** (bead `pulp_wars-2yc.48`; the user,
2026-10-12: "The grass doesn't literally have to be grass. it's just the
native terrain for the faction"). The Cult's is a peat bog, the Undead's
the ground after a wildfire and the Dwarves' mine gravel, each made from
PixelLab art: see [Grounds from PixelLab fields](#grounds-from-pixellab-fields).
The rule, the terrain's name in the rules and the code's names still say
Grass.

The user asked on 2026-10-05: "create a version of grass tile(s) for each
faction. Humans can go with the default grass. other factions will get their
own grass - when they take over some territory the grass turns into their
version. This is an experimental change. implement it and be ready to revert
it."

In the live look of the CHIBI art set, the Grass inside a faction's
territory is drawn in that faction's own look. It follows the territory: a
captured city's land turns with it at once. Presentation only: no rule,
number, save or identity changed. The classic look and the LEGACY art set
are unchanged.

## Turning it off, and reverting it

| To                          | Do                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Look at the game without it | Open it with `?faction-grass=0` (also `off`, `false`). `?faction-grass=1` forces it on.                                           |
| Switch it off for everyone  | Set `FACTION_GRASS_ENABLED_V7` to `false` in [`faction-grass-v7.ts`](../../src/render/canvas/faction-grass-v7.ts). Nothing else.  |
| Remove it                   | `git revert` the bead's one commit. It added new files and 69 inserted lines in four existing files; it changed no existing line. |

With the switch off the board plan carries no `factionGrass` member, the
board host loads no tile, and the board is drawn as before the bead: the
Undead ground (its terrain tile: the Grass tufts in the burnt ground's
colours, no motif) with its straight border, and Ice Folk Snow.

The inserted lines are in `board-renderer-v7.ts` (the plan member, the
renderer input and three draw calls), `board-host-v7.ts` (the art is
created and passed), `scripts/art/pixellab.ts` (`art:validate` re-derives
the tiles) and `package.json` (two script names). Each is marked
`EXPERIMENT pulp_wars-2o7.4` or names `factionGrass`.

## The grounds

| Faction   | Ground                                                                                                                                               | Base      | Tiles                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------ |
| Humans    | The default Grass, also neutral land's ([textured](TEXTURED_GROUNDS.md)): the same green, faintly mottled, with small tufts.                         | `#8ab85c` | one texture, 8 x 8 cells |
| Undead    | Burnt ground (bead `pulp_wars-2yc.48`, [textured](TEXTURED_GROUNDS.md)): mottled warm ash, burnt twigs and bushes, charred lumps, a few embers.      | `#716a64` | one texture, 8 x 8 cells |
| Goblins   | Dry grass (bead `pulp_wars-2yc.53`, [textured](TEXTURED_GROUNDS.md)): straw in soft drifts, thick with tall tufts, seed heads, scrub, a few bones.   | `#d3c176` | one texture, 8 x 8 cells |
| Dinosaurs | Jungle floor ([textured](TEXTURED_GROUNDS.md)): a darker, bluer green mottled with moss, leaf litter and low plants.                                 | `#63a35b` | one texture, 6 x 6 cells |
| Martians  | Regolith (bead `pulp_wars-2yc.48`, [textured](TEXTURED_GROUNDS.md)): speckled rust dust with shaded rocks of several sizes.                          | `#b56c46` | one texture, 8 x 8 cells |
| Dwarves   | Moss-covered stones (bead `pulp_wars-2yc.48`, [textured](TEXTURED_GROUNDS.md)): mottled grey-green moss thick with grey stones, moss on top of them. | `#7d8f66` | one texture, 6 x 6 cells |
| Candy     | Frosting (bead `pulp_wars-2yc.48`): pastel mint frosting, sugar sprinkles in pink, yellow, white and lilac, sugar crystals.                          | `#a4dabd` | 6                        |
| Ice Folk  | Snow. Every land tile of Ice Folk territory is Snow by rule, so they need no grass of their own.                                                     | n/a       | n/a                      |
| Cultists  | Peat bog (bead `pulp_wars-2yc.48`): olive peat, small teal puddles, reed tufts, pale glow specks.                                                    | `#76805a` | 6                        |

**Some grounds are textures, not tiles**
([textured grounds](TEXTURED_GROUNDS.md)): the default Grass, the Martian
regolith, the Dwarf moss-covered stones, the Undead burnt ground, the
Dinosaur jungle floor and the Goblin dry grass are each one large texture
the board samples by a cell's place on the map. The Dwarf mine gravel
described further down was the Dwarf ground for a day (2026-10-13), and
the Goblin savannah tiles until 2026-10-14 (bead `pulp_wars-2yc.53`);
both are sample looks now; the
Martian red dust was a recipe of the recoloured grounds.

## Grounds from PixelLab fields

Bead `pulp_wars-2yc.48`. The user, 2026-10-12: "some of the grass skins
require more work. cultists' grass is just pink and looks like nothing in
particular. dwarf grass is so so. undead could be better. [...] for
cultists it could be swamp or volcanic terrain. not sure. for the undead
probably aftermath of a wildfire is what we're looking for." Root
decisions: the Cult a bog, the Undead a wildfire's aftermath, the Dwarves a
candidate of the worker's choice.

### The pipeline

1. **Fields.** A field is one 160 x 160 Pixflux image forced to a small
   palette, made by the chibi pipeline's `terrain` class in the exploration
   run `art/explorations/faction-grounds-2026-10/` (recipes, subjects,
   palettes, raw fields, credential-free receipts and the review of every
   field). [`candidates.ts`](../../scripts/art/faction-grounds/candidates.ts)
   is the one list of candidates; `faction-grounds.ts plan` writes the
   run's manifest, subjects and palettes from it.
2. **Motifs.** Pixflux does not draw a tile: it draws a field with a band
   of moss through it or a rock in a corner, as dense as it likes. So a
   tile is composed in code from the field's features
   ([`derive.ts`](../../scripts/art/faction-grounds/derive.ts)): every
   connected group of pixels that is not the field's base colour and does
   not touch its edge is a motif (a reed tuft, a puddle, a burnt bush, an
   ember, a stone). No pixel of a motif is redrawn.
3. **Looks.** A look ([`looks.ts`](../../scripts/art/faction-grounds/looks.ts))
   names its fields, the board colour of each palette colour, and its kinds
   of motif (by size and colour) with how many a tile gets. A tile is the
   flat ground colour with a seeded number of each kind on it, at least
   2 px inside the tile and 3 px apart. So every edge pixel of every tile
   is the ground colour: any tile joins any other, and any other ground's
   spill, without a seam. Colours are tuned in the look and never by
   another generation. The one shape cut in code is a `blob`, a flat patch
   of a second ground tone (the Undead soot), as the patches of the
   recoloured grounds are.
4. **Bake.** `npm run art:faction-grass -- bake` writes the tiles of the
   looks marked `CHOSEN` beside the recoloured grounds
   (`faction-grass/chibi-<faction>-grass-1..6.png`) and records each look's
   fields with their hashes in `scripts/art/faction-grass.json`; `check`
   (in `art:validate`) re-derives them.

```sh
npx tsx scripts/art/faction-grounds.ts plan
npm run art:chibi -- plan --exploration art/explorations/faction-grounds-2026-10
node node_modules/.bin/tsx scripts/art/chibi-pipeline.ts \
  generate --exploration art/explorations/faction-grounds-2026-10 --ids <recipe>
npx tsx scripts/art/faction-grounds.ts contact <out.png> <recipe>...
npx tsx scripts/art/faction-grounds.ts motifs <recipe> <out.png>
npx tsx scripts/art/faction-grounds.ts look <look> <out.png>
npx tsx scripts/art/faction-grounds.ts sheet <FACTION> <out.png> [--ref main]
npx tsx scripts/art/faction-grounds.ts overview <out.png>
```

Only `generate` calls PixelLab; it reads the key from the
`PIXELLAB_API_KEY` environment variable.

**The run's own style and class texts.** The first three fields, with the
production texts ("a board game come to life", "terrain ground for a
strategy map"), were scenes: lily pads in the four corners, clumps of burnt
trees, a paved road across a lawn. The run's `fragments/` ask for "one
seamless repeating ground texture swatch" with "nothing tall", and the
subjects use small words ("tiny puddles", "twigs lying flat"); every field
after that is a texture. The class negative of the run has no "red" (the
Martian rust).

**Six tiles.** A ground made from fields has six tiles, a recoloured one
three. A cell's variant is one of six (`FACTION_GRASS_CELL_VARIANTS_V7`);
a ground of three takes it modulo three, which is the tile it always drew.
With three tiles a puddle or a burnt bush came back every third cell.

### The three grounds

| Ground                                       | Fields                                                                                                 | Motifs per tile                                                                                               | What was tried                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cult: peat bog** (`cult-bog`)              | `cult-swamp-b` (reeds, blades, glow specks), `cult-swamp-d` (puddles, sprigs)                          | 1 or 2 puddles, 0 to 2 reed tufts, 2 to 4 blades, 0 to 2 sprigs, 0 to 2 glow specks, 3 to 6 specks            | `cult-swamp-a`: lily-pad rosettes in the corners. `cult-swamp-c`: four pits with walls. `cult-moss-a`: water with outlined pads. Runner-up `cult-dark-swamp`: the same motifs on a dark teal `#55706a`. |
| **Undead: burnt ground** (`undead-wildfire`) | `undead-ash-b` (twigs, burnt bushes, embers, flecks), `undead-ash-c` (charred lumps with an ember rim) | 0 to 2 soot patches (cut in code), 0 to 2 lumps, 0 or 1 burnt bush, 2 to 4 twigs, 0 or 1 ember, 5 to 8 flecks | `undead-ash-a`: clumps of burnt trees. `undead-char-a`: flames. Runner-up `undead-pale-ash`: twigs and embers on a pale ash `#928d87`, no soot.                                                         |
| **Dwarf: mine gravel** (`dwarf-gravel`)      | `dwarf-gravel-a`                                                                                       | 3 to 5 stones (some with verdigris), 1 to 3 copper chips, 26 to 36 grains of grit                             | `dwarf-flags-a`, `-b`, `-c`: worked stone flags, dropped (below). Runner-up `dwarf-slate`: a blue-grey slate highland with moss cushions and cracks.                                                    |

**Why these.**

- **The bog is olive, not teal.** The root's first idea was a dark teal
  swamp. The Cult's robes are a dark indigo, and the Horror, the frog and
  the lantern wood are teal: on the dark teal runner-up all four sink into
  the ground. On olive peat at mid value the robes, the teal creatures and
  the blue-green willows each stand off it, and the teal is kept for the
  puddles.
- **The burnt ground is a warm ash at 42% luma.** The Undead's flesh is a
  pale ash grey and their cloth near black: the ground sits between the
  two, warm where the dead wood and the mountain rock are cool. It is the
  darkest ground on the map.
- **The gravel, not the slate or the flags.** The slate highland is the
  prettier tile, but it is the blue-grey of the rocky Mountain ground and
  of the Dwarf city's stone: a Dwarf land read as one bare rock. Gravel is
  pale and warm, so the grey forts, the dark pines and the copper of the
  units all stand off it, and the verdigris and copper are the Dwarves'
  own metals. Flagstones were dropped: Pixflux lays them 34 px wide, so no
  80 px tile of them repeats, and their straight joints run beside
  borders, roads and move highlights.

Measured (CIE76, `faction-grounds.ts overview`): the bog is 60 from the
cloud of unexplored land (`#685f9c`), 35 from the default Grass and 21 from
the burnt ground, its nearest; the burnt ground 40 from the cloud and 55
from the Grass; the gravel 54 from the cloud, 44 from the Grass and 22 from
the Martian dust, its nearest ground. The three differ in value too: 47%,
42% and 68% luma, with the default Grass at 62%.

### The Undead ground on the board

Until this bead the Undead ground was the terrain tile itself
(`TERRAIN:UNDEAD:GRASS`, three masters the board tones like Grass), and
this module drew only its spill. The tone cannot be taken back for a
ground with near-black charcoal in it: it softens every pixel whose
channels are all 62 or less as an outline. So the burnt ground is a baked
tile like every other ground's, drawn over the terrain tile, and
`FACTION_GRASS_TILES_V7` lists it untoned. The terrain masters
(`chibi-undead-grass-1..3`, [`gloam-grass.ts`](../../scripts/art/faction-buildings/gloam-grass.ts))
stay underneath: the Grass tufts in the burnt ground's ash, soot and pale
ash (each colour taken back through the tone), with no motif. They are
what shows with `?faction-grass=0` and in the tile dock of a plain Grass
cell.

### What follows the ground

- **Rank.** Palest first: Candy, Goblins, Dwarves, Dinosaurs, Martians,
  Cultists, Undead.
- **Forests.** Each faction's foliage is lifted toward its ground, so the
  Cult, Undead and Dwarf sets were baked again (72 files), and the Candy
  and Goblin sets with their grounds (49 files); the Undead set's ground is
  now the baked tile. The shade under the trees
  (`FACTION_FOREST_FLOOR_V7`) is a dark moss for the Cult, a dark soot for
  the Undead, a dark stone for the Dwarves and a dark straw for the
  Goblins; the Candy's dark mint is unchanged.
- **Missing art.** A missing Undead ground is washed ash (`#716a64`) and a
  missing Undead wood a darker ash, where both were the default greens.
- **The Gallery** names them "Bog", "Burnt ground", "Gravel", "Frosting"
  and "Savannah" in the Grass row and shows the six tiles of each.

### Samples and the user's picks

The user, 2026-10-12: "make candy grass also more interesting. with
sprinkles and stuff. for martians we can make it look more like mars. for
goblins, idk savannah? make some samples and I'll review." Nine looks were
made, three a faction (`faction-grounds.ts sheet <FACTION>` draws each
beside the ground of a revision). **The user's answer, 2026-10-13:** "I
agree with all your picks for which option is best", and of the Martian
one, "the martian texture is half assed. I'd do more varied (but still
discrete!) rocks". So **Candy A and Goblin A are wired** (the frosting and
the savannah of the table at the top), and the Martian ground stays the
recoloured red dust while a textured ground is tried for it.

- **The frosting** is the sugar meadow's mint, a shade paler (`#a4dabd`),
  with sprinkles of 5 to 16 px where the meadow had specks of two, and no
  grass tufts: four to six sprinkles and five to eight sugar crystals a
  tile, from the field `candy-frosting-a`.
- **The savannah** is a pale golden straw (`#d3c176`, 74% luma, where the
  scrubland was a yellow-green `#a9ac5c` at 63%): up to one large tuft, one
  or two clumps, three to six blades and a few specks a tile, from the
  fields `goblin-savannah-a` and `-b`. It is 28 from the default Grass,
  where the scrubland was 18, and the green Goblins stand off it more.

| Faction  | A                                                                    | B                                                                  | C                                                                     | Recommended                                                                                                           |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Candy    | Mint frosting with sprinkles and sugar crystals (`candy-frosting-a`) | Cookie dough with chocolate chips and sprinkles (`candy-cookie-b`) | Vanilla icing with sugar pearls and piped squiggles (`candy-icing-a`) | A: it keeps the mint the candy grove was coloured against; the chocolate units are lost on B, and C is close to Snow. |
| Martians | Butterscotch dust with rocks (`martian-regolith-a`, `-b`)            | Deep rust plain with stones (`martian-rust-a`)                     | Salmon dust with small crater rings (`martian-ripples-a`)             | B: the reddest and the farthest from the Dwarf gravel and a Goblin savannah; the chrome units stand off it most.      |
| Goblins  | Dry golden savannah (`goblin-savannah-a`, `-b`)                      | Scrubby badlands (`goblin-badlands-a`)                             | Trampled camp mud (`goblin-mud-b`)                                    | A: a clear step from the default green, where B is the Dwarf gravel's tan and C the bog's value.                      |

To wire another: give its look the status `CHOSEN`, add the faction to
`FIELD_GROUND_IDS` (taking its recipe out of `FACTION_GRASS_RECIPES`), set
its count in `FACTION_GRASS_TILE_COUNTS_V7`, bake the grass and the
forests, and place it in the rank.

## The recoloured grounds

**The first Cult ground** was a heather moor (bead `pulp_wars-mch9.22`,
dusty rose-mauve `#cc95a0`), the first Dwarf ground a stony moor
(`#959c7c`), the first Goblin ground a scrubland (`#a9ac5c`) and the first
Candy ground a sugar meadow (`#9cd4b6`), all recipes of the list below
until bead `pulp_wars-2yc.48`;
the Undead ground was the "gloam" (bead `pulp_wars-xdh.2`) and then the
ashen ground (bead `pulp_wars-2yc.14`, `#7f9a86`). Their tiles are in the
repository's history. The recipes of the list carry their seed since then,
so the ground left, the Dinosaurs', is byte for byte what it was.

### How the tiles are made

[`scripts/art/faction-grass.ts`](../../scripts/art/faction-grass.ts) derives
every tile of the Dinosaur ground in code from
the three accepted Grass masters. No PixelLab call was made for these.

```sh
npm run art:faction-grass -- bake
npm run art:faction-grass -- check     # also in art:validate
npm run art:faction-grass -- stats
npm run art:faction-grass -- sheet <out.png>
```

1. The Grass master is toned as the live look tones every Grass tile.
2. Its four colours (the base and three tuft colours) are swapped for the
   faction's. The tufts, the three variants and the seamless joins stay.
3. A few motifs are placed by a seeded hash, at least 3 px inside the tile,
   so every variant joins every other: patches (mud, lichen, moss),
   two-row stones, fern stamps, sprinkles, and a share of the tufts in other
   colours.

The motifs are drawn by the script (a patch is a noisy ellipse, a fern a
7 x 6 stamp). That is the one place where shapes come from code rather than
from PixelLab, and it is the first thing to replace if the experiment stays.

The tiles are baked in their final colours and drawn as they are.
`scripts/art/faction-grass.json` records the recipes and the hash of every
source and tile.

### Tone

`stats` over the three tiles of each ground, as drawn:

| Ground    | Luma  | Saturation | Luma spread | Pixels off the base colour |
| --------- | ----- | ---------- | ----------- | -------------------------- |
| Default   | 62.4% | 50.0%      | 1.9%        | 2.5%                       |
| Goblins   | 74.0% | 44.4%      | 2.7%        | 3.0%                       |
| Dinosaurs | 51.3% | 44.7%      | 2.8%        | 5.2%                       |
| Martians  | 48.5% | 61.1%      | 3.0%        | 10.8%                      |
| Candy     | 78.0% | 24.7%      | 1.9%        | 1.2%                       |
| Cultists  | 47.2% | 29.8%      | 3.6%        | 4.6%                       |
| Undead    | 41.8% | 11.5%      | 2.0%        | 4.2%                       |
| Dwarves   | 54.1% | 23.9%      | 5.6%        | 41.1%                      |

Every ground is nearly as flat as the default Grass (a luma spread under
3%; the bog's reeds and puddles make it 3.6%). The Undead ground is the
darkest and the greyest, Candy the lightest.

## On the board

A terrain plan entry of a Grass, Forest or Mountain cell inside the
territory of a faction with a ground carries `factionGrass: <FACTION>`
(`factionGrassPlanMemberV7`). The renderer draws, in the ground pass, over
the cell's Grass and under the forest shade, Snow, Roads, resources,
improvements and units:

1. **the cell's own tile** (the Undead's too since bead
   `pulp_wars-2yc.48`, over its terrain tile);
2. **the spill of every neighbouring ground of a higher rank**: that
   ground's tile cut to an irregular strip about 10 px wide along the
   shared edge, with a blob at a shared corner and a few loose specks.

The ranks, lowest first: default Grass, Candy, Goblins, Dwarves, Dinosaurs,
Martians, Cultists, Undead. A ground runs out over every ground below it, so no
border between two grounds is a straight line, and the darker land always
runs into the lighter one. The strip's width is a wave over board pixels
that repeats every three cells: the strips of two cells meet without a
step.

Where it applies:

- **Grass**, with everything that stands on it (resources, Farms and other
  improvements, Roads, cities, units).
- **Forest**: the ground under the trees and the open ground of a glade.
- **Mountains**: the Grass under the rocky ground's fringe. A Mountain
  cell surrounded by Mountains shows no Grass and draws none.
- **Unexplored cells** draw nothing and give nothing: the spill reads
  explored terrain entries only.
- **Captures**: the plan follows `territoryOwnerId`, so a cell changes
  ground in the same redraw as its border.

## Review

The Undead ground, wood and Graveyard are reviewed together by
`scripts/art/undead-terrain/review-scenes.ts` (and `review-scenes-grass.ts`
for this switch) through `scripts/art/look-switch-review.ts`.

The scenes of bead `pulp_wars-2yc.48`
([`review-scenes.ts`](../../scripts/art/faction-grounds/review-scenes.ts),
run through `look-switch-review.ts` with `SWITCH_BEFORE_URL` naming a
second server on the commit before) are the Cult's, the Undead's and the
Dwarves' land as the player's own, eight cells by eight, between Human
land and another faction's, with a neutral row and unexplored land round
it: a capital, a wood, Mountains, Fruit, Game, Ore, a Farm, a Road, three
units and a Human unit beside one, at the default zoom, one step in with
that unit selected (its moves and its target), and at phone width.
[`gallery-capture.ts`](../../scripts/art/faction-grounds/gallery-capture.ts)
captures the Gallery's Terrain tab.

`npm run art:faction-grass-review -- <out-dir>` (a dev server on port 6593,
`CHROME_PATH` set) captures the real game over drawn scenes: for each
faction, its capital and territory beside the Human one with Forest,
Mountains, a Mine, resources, Farms, a Road and units of both sides; an
eight-seat map with every territory widened; and the Goblin, Undead and
overview scenes with `?faction-grass=0`.

## Known limits

- ~~A Rift inside a faction's territory keeps default Grass round its
  crack.~~ Fixed by bead `pulp_wars-2yc.102`: the art resolver draws a Rift
  piece without its Grass and the board lays the crack over the cell's
  ground like any land cell's ([the Rift](classes/terrain-tiles.md#ruleset-7-rift-pulp_wars-9s05)).
- **The glade's edge stays green.** Under a resource in a wood on red dust,
  mint, gravel or ash the glade's rim reads as a greener ring.
- **A glade does not draw the neighbour's spill to its edge**: its open
  ground is cut to the glade's round, soft-edged shape.
- **Shared Farms keep their own look** on Goblin, Dinosaur, Candy and Cult
  ground: brown beds with green crops, which read on all four.
- **The tile dock of a plain Grass, Road or resource cell** shows the
  default Grass (for the Undead: the terrain tile, tufts in ash colours).
  Only a Forest or a Mountain cell's dock shows the faction's ground.
- **Candy is the loudest ground**: light mint over a large territory is a
  bright area on the map.
- **The gravel's stones are round and alike**: seen over a large Dwarf land
  they can read as dots.
- **A puddle of the bog is 8 to 12 px**: a dark teal spot at board size, a
  pool only enlarged.
- **The lantern wood and the Horror are teal on olive**: they read, and the
  wood no longer stands on a pink moor, but a wood drawn for the bog
  (darker trunks, warmer lantern light) would sit better. The Undead dead
  wood is a pale grey on dark ash and reads well.
- **The soot patches of the burnt ground are cut in code**, as the patches
  of the recoloured grounds are; every other shape of the three new
  grounds is PixelLab's.
- **The burnt ground is dark beside the default green**: the border is a
  clear step in value, softened only by the spill.
