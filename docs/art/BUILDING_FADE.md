# Faded tile buildings

**Bead:** `pulp_wars-2yc.61`. The user, 2026-10-16: the robed cultists and the
Cult buildings are close in colour and weight; make the buildings "a teensy
bit more faded" so the sawmills, workshops and such read more as background,
the way trees, fruit and animals already do (cute and legible but subtly
backgroundy). Cities keep standing out.

In the live look the board draws every tile improvement from a faded copy of
its raster. Presentation only: no art was regenerated and no rule changed.
The classic look is unchanged.

## Turning it off or trying another strength

| To                              | Do                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Look at the game without it     | Open it with `?building-fade=0` (also `off`, `false`).                                                                 |
| Try another strength            | Open it with `?building-fade=light`, `medium` (the live one) or `strong`.                                              |
| Change or switch it off for all | Edit `BUILDING_FADE_V7` in [`building-fade-v7.ts`](../../src/render/canvas/building-fade-v7.ts) (`null` turns it off). |
| Review it again                 | `tsx scripts/browser-building-fade-review-v7.ts http://localhost:<port>/ --output-dir=<dir>` with the dev server.      |

## What is drawn

Each opaque pixel of the sprite is mixed toward its own grey (85% of the
colour kept), then the whole sprite toward the mean colour of the ground of
the territory it stands in (80% of the distance kept), as distant things
take on the colour of the air. The ground is the territory's faction ground
(the Cult's peat bog, the Candy mint frosting, the Dwarf mossy stones and so
on) and the default Grass for the Human and Ice Folk territories and outside
every territory; the colours are measured means of the ground tiles, kept in
`BUILDING_FADE_GROUNDS_V7`.

- The dark outline softens with the rest of the sprite, so the building
  weighs less; it stays darker than everything inside it.
- The change is the same for every pixel, so the order of light and shade
  is kept: the light still falls from the bottom-left.
- Alpha is untouched: the silhouette, edges and transparency are the same.
- A masked building's owner colour is recoloured first and fades with the
  rest; the territory border carries the owner.
- The developer saturation slider (`pulp_wars-x6c`) still applies, before
  the fade.

**Faded:** Farm, Lumber Camp, Windmill, Sawmill, Forge, Workshop, Market,
Port, Shipyard and every faction's version of them (the Cult, Candy, Dwarf,
Undead, Goblin, Dinosaur, Martian and Ice Folk sets, including the special
farms and mills).

**Kept at full strength:**

- cities and villages: they must stand out;
- units;
- Monuments: they are achievements. The review compared the shared obelisk
  faded and bold: faded, the already quiet grey stone turned murky green
  and lost its point; bold, it is a small accent that does not clutter;
- the Mine: it is part of the Mined Mountain art, and a faded mountain no
  longer matched the mountains beside it (its snow turned green-grey);
- the Field Defense badge: a tactical marker with a number on it;
- the build buttons and thumbnails of the tile dock: they are interface,
  not board.

The Gallery's Buildings tab (bead pulp_wars-2yc.68) shows each building on
its faction's ground as the board does, so it draws the tile improvements
with the fade too, toward the same ground as the board (the faction's
ground, the default Grass for the Humans, the Ice Folk and a shared cell).

## Choosing the strength

Measured over the opaque pixels of each sprite, against the ground it
stands on (`light` keeps 92% / 88%, `medium` 85% / 80%, `strong` 75% / 70%):

| Group                      | Saturation | Inner contrast (luma SD) | Outline share (luma < 60) | RGB distance from ground |
| -------------------------- | ---------- | ------------------------ | ------------------------- | ------------------------ |
| Trees (the reference)      | 0.37       | 40                       | 0.11                      | 89                       |
| Fruit                      | 0.39       | 58                       | 0.23                      | 118                      |
| Animals                    | 0.19       | 72                       | 0.33                      | 140                      |
| Cities (unchanged)         | 0.36       | 72                       | 0.37                      | 157                      |
| Buildings before           | 0.41       | 66                       | 0.29                      | 137                      |
| Buildings, light           | 0.34       | 58                       | 0.25                      | 120                      |
| **Buildings, medium**      | **0.31**   | **52**                   | **0.21**                  | **108**                  |
| Buildings, strong          | 0.28       | 46                       | 0.15                      | 93                       |
| Cult buildings before      | 0.46       | 61                       | 0.19                      | 114                      |
| **Cult buildings, medium** | **0.30**   | **49**                   | **0.16**                  | **88**                   |

`medium` puts the buildings inside the band of the trees and the fruit on
every measure, well below the cities. In the screenshots `light` was barely
visible, and `strong` turned the Candy buildings grey-mint and the Dwarf
ones muddy. `medium` keeps every building recognisable and readable while it
sits back like the trees; the Cult's purple roofs move toward the peat bog,
which separates them from the robed cultists (whose sprites are a later
bead). An earlier try pulled toward one neutral grey for every territory: on
the dark Cult and Undead grounds it made the buildings milky and lighter
than their ground, so they stood out more; it was dropped for the ground's
own colour.

The copies are built once per sprite, level, strength and ground in the
sprite saturation cache, so a frame does no pixel work: in the review a
full-board redraw (a zoom step, warm caches, median of 60) took 2.0 ms with
the `medium` fade and 2.5 ms without it, and runs vary by about a
millisecond either way: draw time is flat.
