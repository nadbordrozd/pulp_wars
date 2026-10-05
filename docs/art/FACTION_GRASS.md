# Faction grass (experiment)

**Bead:** `pulp_wars-2o7.4`. **Status:** an experiment, on by default, built
to be switched off or reverted.

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
board host loads no tile, and the board is drawn exactly as before the
bead: the Undead gloam Grass with its straight border and Ice Folk Snow
included.

The inserted lines are in `board-renderer-v7.ts` (the plan member, the
renderer input and three draw calls), `board-host-v7.ts` (the art is
created and passed), `scripts/art/pixellab.ts` (`art:validate` re-derives
the tiles) and `package.json` (two script names). Each is marked
`EXPERIMENT pulp_wars-2o7.4` or names `factionGrass`.

## The grounds

| Faction   | Ground                                                                                           | Base      |
| --------- | ------------------------------------------------------------------------------------------------ | --------- |
| Humans    | The default Grass.                                                                               | `#8ab85c` |
| Undead    | The gloam Grass of bead `pulp_wars-xdh.2`, unchanged. Its border is now soft.                    | `#7ba56d` |
| Goblins   | Scrubland: yellowed, trampled turf, a third of the tufts dry straw, one or two mud patches.      | `#a9ac5c` |
| Dinosaurs | Jungle floor: a darker, bluer green with ferns.                                                  | `#5f9f58` |
| Martians  | Red dust: ochre-red ground with teal lichen patches and pale stones.                             | `#b98c6a` |
| Dwarves   | Stony moor: grey-khaki short turf with moss patches and grey stones.                             | `#959c7c` |
| Candy     | Sugar meadow: pastel mint with sprinkles in pink, yellow, white, blue and lilac.                 | `#9cd4b6` |
| Ice Folk  | Snow. Every land tile of Ice Folk territory is Snow by rule, so they need no grass of their own. | n/a       |

**The Undead gloam was reviewed and kept.** It is the calmest of the set
and reads as dusk beside every other ground; its weak point was the
straight colour step at the border, which the spill below removes.

### How the tiles are made

[`scripts/art/faction-grass.ts`](../../scripts/art/faction-grass.ts) derives
every tile in code from the three accepted Grass masters. No PixelLab call
was made.

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

The tiles are baked in their final colours and drawn as they are; only the
Undead tiles go through the terrain tone, to match the tile the board
already draws. `scripts/art/faction-grass.json` records the recipes and the
hash of every source and tile.

### Tone

`stats` over the three tiles of each ground, as drawn:

| Ground    | Luma  | Saturation | Luma spread | Pixels off the base colour |
| --------- | ----- | ---------- | ----------- | -------------------------- |
| Default   | 62.4% | 50.0%      | 1.9%        | 2.5%                       |
| Undead    | 57.0% | 33.8%      | 2.1%        | 2.5%                       |
| Goblins   | 63.0% | 46.5%      | 2.6%        | 4.4%                       |
| Dinosaurs | 51.3% | 44.7%      | 2.8%        | 5.2%                       |
| Martians  | 58.3% | 42.6%      | 2.5%        | 4.9%                       |
| Dwarves   | 58.6% | 20.7%      | 2.4%        | 4.5%                       |
| Candy     | 75.0% | 26.6%      | 2.4%        | 3.8%                       |

Every ground is as flat as the default Grass (a luma spread under 3%). The
Dinosaur ground is the darkest and Candy the lightest.

## On the board

A terrain plan entry of a Grass, Forest or Mountain cell inside the
territory of a faction with a ground carries `factionGrass: <FACTION>`
(`factionGrassPlanMemberV7`). The renderer draws, in the ground pass, over
the cell's Grass and under the forest shade, Snow, Roads, resources,
improvements and units:

1. **the cell's own tile** (not for the Undead, whose tile is the terrain
   tile itself);
2. **the spill of every neighbouring ground of a higher rank**: that
   ground's tile cut to an irregular strip about 10 px wide along the
   shared edge, with a blob at a shared corner and a few loose specks.

The ranks, lowest first: default Grass, Candy, Goblins, Martians, Dwarves,
Undead, Dinosaurs. A ground runs out over every ground below it, so no
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

`npm run art:faction-grass-review -- <out-dir>` (a dev server on port 6593,
`CHROME_PATH` set) captures the real game over drawn scenes: for each
faction, its capital and territory beside the Human one with Forest,
Mountains, a Mine, resources, Farms, a Road and units of both sides; an
eight-seat map with every territory widened; and the Goblin, Undead and
overview scenes with `?faction-grass=0`.

## Known limits

- **A Rift inside a faction's territory keeps default Grass** round its
  crack: the Rift pieces carry their Grass in the master.
- **The forest shade and the glade's edge stay green.** Under trees on red
  dust or mint the shade reads as a darker, greener patch.
- **A glade does not draw the neighbour's spill to its edge**: its open
  ground is cut to the glade's shape.
- **Shared Farms keep their own look** on Goblin, Dinosaur and Candy
  ground: brown beds with green crops, which read well on all three.
- **The tile dock, the Gallery and Help** show the default Grass (and the
  Undead gloam, as before).
- **Candy is the loudest ground**: light mint over a large territory is a
  bright area on the map. **The Dwarf ground is the dullest**, and beside
  the rocky Mountain ground it can read as bare land.
- Undead against default Grass is a low-contrast border, so its spill is
  hard to see; that is the gloam's accepted calm.
