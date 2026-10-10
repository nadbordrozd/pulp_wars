# Settlement ground shadow (a try)

**Beads:** `pulp_wars-2yc.8` (the shadow), `pulp_wars-2yc.12` (fitted to each
sprite). The user, 2026-10-05: "try to add a drop shadow to city sprites so
they are less floaty."

In the live look of the CHIBI art set a city or a village stands on a soft
ground shadow. Presentation only. The classic look and the LEGACY art set
are unchanged.

## Turning it off

| To                              | Do                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Look at the game without it     | Open it with `?city-shadow=0` (also `off`, `false`). `?city-shadow=1` forces it on.                                            |
| See the one shape it used to be | Open it with `?city-shadow=plain`: every settlement gets the same ellipse, as before `pulp_wars-2yc.12`.                       |
| Switch it off for everyone      | Set `SETTLEMENT_SHADOW_ENABLED_V7` to `false` in [`settlement-shadow-v7.ts`](../../src/render/canvas/settlement-shadow-v7.ts). |

## What is drawn

Two flat ellipses under the sprite, by code
([`settlement-shadow-v7.ts`](../../src/render/canvas/settlement-shadow-v7.ts));
no raster:

- the **contact**: the colour of the units' ground shadow
  (`rgba(18, 22, 30, 0.24)`), under the footprint of the buildings. Most of
  it is hidden by them; what shows is a thin rim round their feet;
- the **cast**: the same ellipse at half the strength, a little wider and
  moved up and to the right, because the sun is at the bottom left (the
  user, 2026-10-05). It shows past the right-hand end of the buildings and
  is short on purpose.

It is drawn just before the sprite, so it lies on whatever ground the cell
has: Grass of any faction, Snow, sand at a coast. It scales with the
sprite. Farms and other improvements get none: most carry their own ground
patch.

## Fitted to each sprite

Like a unit's shadow, a settlement's is placed from a measurement of its
own raster. `npm run art:settlement-shadows-measure` reads every settlement
raster the live look draws first (each faction's city at art levels 1, 2
and 3, the Human ones, and the Village) and writes
[`settlement-shadow-measurements-v7.generated.ts`](../../src/render/canvas/settlement-shadow-measurements-v7.generated.ts).
Run it after a city or village raster changes; a unit test fails while the
table is stale, and `-- --check` reports it without writing.

A settlement is drawn from above and in front, so its footprint shows as
the sprite's lower outline: per column, the lowest opaque pixel
([`scripts/art/settlement-shadows/measure.ts`](../../scripts/art/settlement-shadows/measure.ts)).
The measurement keeps:

| Value             | Meaning                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `left`, `right`   | the ends of the footprint (columns with at least two opaque pixels)                                                      |
| `leftY`, `rightY` | the ground line at each end: the median outline of the outer 12% of the columns                                          |
| `contactY`        | the front of the footprint: one past the lowest row with at least two opaque pixels                                      |
| `fullness`        | how much of the ellipse through those points the outline fills: near 1 for round ground, about 0.75 for a walled diamond |

The contact ellipse is centred between the ends, on the lower of the two
ground lines (where they differ, the higher end is a roof, a banner or a
mast hanging over the edge). Its radii are the footprint's half-width and
its depth from front to centre, each times the fullness, plus a 2.5 px
rim. The depth is held between 30% and 58% of the half-width. The cast is
the contact moved right by 20% of the half-width and up by 10%, and 6%
wider. All in master pixels (`SETTLEMENT_SHADOW_FIT_V7`).

A raster that was not measured (a stand-in while the live one loads) keeps
the one shape: 94% of the sprite's width and 44% of that high, centred a
little right of the middle of the lower part of the sprite.

## Review

Every settlement on a flat ground, the one shape beside the fitted one, at
native size and three times enlarged; no browser:

```sh
npm run art:settlement-shadows-review -- --out <out-dir>
```

The real board, every faction's capital at art levels 1, 2 and 3 on its
own ground, at the normal zoom (with the city again at 3x) and one zoom
step in; "before" is the one shape:

```sh
npx vite --port 6593 --strictPort &
CHROME_PATH=... SWITCH_BEFORE_VALUE=plain npx tsx scripts/art/look-switch-review.ts scripts/art/city-shadow/level-scenes.ts <out-dir>
```

Without the shadow against with it (the capitals of five factions, the
Human capital and a village, each at 1x and 3x):

```sh
CHROME_PATH=... npx tsx scripts/art/look-switch-review.ts scripts/art/city-shadow/review-scenes.ts <out-dir>
```

## Known limits

- The fit is an ellipse. A walled town's footprint is a diamond: its side
  corners reach past the contact shadow, and the shadow shows as thin
  slivers along its lower walls.
- A unit garrisoned in a city stands on the city's shadow and its own.
- The title screen's city has no ground shadow.
