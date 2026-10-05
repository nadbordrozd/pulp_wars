# Settlement ground shadow (a try)

**Bead:** `pulp_wars-2yc.8`. The user, 2026-10-05: "try to add a drop shadow
to city sprites so they are less floaty."

In the live look of the CHIBI art set a city or a village stands on a soft
ground shadow. Presentation only. The classic look and the LEGACY art set
are unchanged.

## Turning it off

| To                          | Do                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Look at the game without it | Open it with `?city-shadow=0` (also `off`, `false`). `?city-shadow=1` forces it on.                                            |
| Switch it off for everyone  | Set `SETTLEMENT_SHADOW_ENABLED_V7` to `false` in [`settlement-shadow-v7.ts`](../../src/render/canvas/settlement-shadow-v7.ts). |

## What is drawn

Two flat ellipses under the sprite, by code
([`settlement-shadow-v7.ts`](../../src/render/canvas/settlement-shadow-v7.ts));
no raster:

- the **contact**: the colour of the units' ground shadow
  (`rgba(18, 22, 30, 0.24)`), 94% of the sprite's width and 44% of that
  high, centred a little right of the middle under the lower part of the
  sprite, where the buildings meet the ground. Most of it is hidden by the
  buildings; what shows is a rim round their feet;
- the **cast**: the same ellipse at half the strength, moved 7% of the
  sprite's width to the right and 6% up, because the sun is at the bottom
  left (the user, 2026-10-05). It is short on purpose.

It is drawn just before the sprite, so it lies on whatever ground the cell
has: Grass of any faction, Snow, sand at a coast. It scales with the
sprite, so a village's is smaller. Farms and other improvements get none:
most carry their own ground patch.

## Review

```sh
npx vite --port 6593 --strictPort &
CHROME_PATH=... npx tsx scripts/art/look-switch-review.ts scripts/art/city-shadow/review-scenes.ts <out-dir>
```

Before and after pairs of the capitals of five factions on their own
ground, the Human capital and a village, each at 1x and 3x.

## Known limits

- **One shape for every city.** The ellipse is a share of the sprite's
  rectangle, not measured from each sprite as the units' shadows are. A
  city whose buildings do not fill the lower part of its cell shows more
  shadow than it covers.
- A unit garrisoned in a city stands on the city's shadow and its own.
