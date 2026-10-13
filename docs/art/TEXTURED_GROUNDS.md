# Textured grounds

**Bead:** `pulp_wars-2yc.48`. **Status:** in use. The user, 2026-10-13, on
the samples of this page: "the textured terrain is great. use it. make a
note to investigate the tileset endpoint at pixellab but this is already
acceptable." (The tileset endpoint is bead `pulp_wars-2yc.50`.)

**Textured now:** the Martian regolith and the Dwarf moss-covered stones
(stage 1). The other grounds are tiles until each has a texture that is
clearly better than what is published ([faction grass](FACTION_GRASS.md)).

The user, 2026-10-13, on the grounds of
[faction grass](FACTION_GRASS.md): "My main concern is the texture. the
martian texture is half assed. I'd do more varied (but still discrete!)
rocks. Dwarfs is pretty hard to understand too (mine gravel? no one would
guess that). [...] I would try doing more textures for differentiation
because you can only express so much with just the color. but this would
require using pixellab definitely and we have to remember that this is
still a background and shouldn't stand out too much. But the gold standard
for these tiles should be HoMM 2 tiles. They are beautiful varied and very
clearly express steppe vs grass vs marsh vs volcanic vs sand vs dirt vs
snow. [...] Let's at least experiment with it. see if we can do better
martian ground for starters. And for dwarves let's try 'moss covered
stones' as a direction".

The published grounds are a flat colour with small motifs on it. A textured
ground is a surface that is its material everywhere: speckled dust, mottled
moss, peat with sedge. Three were made: Mars regolith, moss-covered stones
for the Dwarves, and the Cult bog as a marsh (a preview of the method on a
third material).

## What works

1. **Fields at 160 px.** Pixflux, a forced palette of seven or eight close
   tones, medium shading, lineless, in the exploration run
   `art/explorations/textured-grounds-2026-10/`
   ([`candidates.ts`](../../scripts/art/textured-grounds/candidates.ts),
   `textured-grounds.ts plan`). The run has its own style and class texts
   ("hand-painted pixel art terrain texture for the adventure map of a
   classic 1990s fantasy strategy game", "one dense ground texture that
   covers the whole image").
2. **The ground is quilted.** One periodic texture of 480 x 480 px (six
   board cells a side) is synthesised from the parts of the fields that are
   only ground, by image quilting on palette indices
   ([`quilt.ts`](../../scripts/art/textured-grounds/quilt.ts)): blocks of
   48 px overlapping by 16, each a window of a field chosen to continue what
   is already laid, joined to it along the path where the two differ least,
   on a torus, so the texture's right edge continues its left. No pixel is
   blended: every pixel of the texture is a pixel of a field.
3. **The things on it are strewn.** Rocks and stones are the fields' own
   features, cut out whole as the motifs of the flat grounds are, and laid
   over the torus by a seeded roll, so many of each size a cell, the large
   first, none touching another
   ([`compose.ts`](../../scripts/art/textured-grounds/compose.ts)). Turned
   upside down, so the lit side the fields give them (top left) is the
   board's (bottom left).
4. **Colours.** Each palette colour is mapped to a board colour, with the
   value range compressed round the ground colour (`compressed`, 75% for
   Mars), so the ground stays in a narrow band of lightness under the
   units.
5. **The board samples it by map place.** A cell draws the part of the
   texture at its own coordinates modulo the period, so neighbouring cells
   always continue each other and the ground repeats only every six cells.

```sh
npx tsx scripts/art/textured-grounds.ts plan
node node_modules/.bin/tsx scripts/art/chibi-pipeline.ts \
  generate --exploration art/explorations/textured-grounds-2026-10 --ids <recipe>
npx tsx scripts/art/textured-grounds.ts contact <out.png> <recipe>...
npx tsx scripts/art/textured-grounds.ts quilt <look> <out.png>
npx tsx scripts/art/textured-grounds.ts sheet <FACTION> <out.png> [--ref main]
npx tsx scripts/art/textured-grounds.ts bake
```

Only `generate` calls PixelLab; it reads the key from the
`PIXELLAB_API_KEY` environment variable.

## Seamlessness: what was tried

| Method                                                                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) One large field from PixelLab**, made periodic                   | **Failed at the first step.** At 400 x 400 Pixflux does not hold a texture: `martian-regolith-a` is a canyon mouth over evenly striped dust, `dwarf-moss-a` rows of one identical stone on flat green. A painted texture comes only at about 160 px.                                                                                                                                                                                               |
| **(a') A large texture quilted in code from 160 px fields**, WORLD     | **Works; the method above.** Seamless everywhere by construction; repeats every 480 px.                                                                                                                                                                                                                                                                                                                                                            |
| Quilting fields that hold dust and rocks together                      | **Failed.** The nearest window is always the emptiest dust (its join costs nothing), and the texture ends flat with one pebble; with a random draw it is a patchwork of two dusts. Hence two layers: quilt the ground, strew the things.                                                                                                                                                                                                           |
| **(b) PixelLab's own tileset or seamless option**                      | **Not available to the pipeline.** The client (`scripts/art/chibi/batch-manifest.ts`) knows `create-image-pixen`, `create-image-pixflux`, `edit-image-pixen` and `generate-image-v2`; none has a seamless option, and it sends no init or mask image, so no inpainting over a seam. The published OpenAPI names a `create-tileset` (Wang tiles for transitions between two terrains, a background job); it was not added on a guess of its schema. |
| **(c) Tiles that all share one border band**, quilted inside it, TILES | **Works less well.** Any tile joins any other, so the board may pick at random as it does now, but the shared band comes back on every cell edge (a faint lattice), a thing can never cross an edge, and the cut may replace band pixels, so two tiles' edges agree only nearly. It is look C of the Martian and Dwarf sheets.                                                                                                                     |

## The three samples

`textured-grounds.ts sheet <FACTION>` draws each beside the published
ground, with three units, the faction's wood, a city, two resources, a
Road, a border line and two move highlights (the last three drawn by the
sheet, like the board's).

| Faction  | Looks                                                                                                                                                                             | Fields                                                                                                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Martians | **A** regolith, WORLD (chosen); B the same at the fields' own contrast; C six tiles with a shared band                                                                            | dust: `martian-regolith-e`, `-f`; rocks: those and `martian-regolith-c`, `-d`, `martian-rocks-a`, `-b`. About one rock, one and a half stones and a fifth of a boulder a cell.    |
| Dwarves  | **A** moss-covered stones, WORLD (chosen); B the same moss with half the stones; C tiles; D a bed of cobbles quilted from `dwarf-cobbles-a`, which came out as even as scale mail | moss: the inside of `dwarf-moss-c`; stones: `dwarf-stones-a`, `-b`, `dwarf-moss-c`, with every green of the palette as ground, so the moss of the ground shows on top of a stone. |
| Cultists | **A** marsh with water, WORLD (preview); B sedge and peat only                                                                                                                    | `cult-marsh-b`, quilted whole (A) or from its banks only (B). No strewn layer.                                                                                                    |

Rejected fields and why are in the run's `records.json` (eight of eighteen:
every "bed of stones" asked of Pixflux came back a scene with a stream, a
cliff or a garden wall, which is why the Dwarf stones are cut from two
sheets of separate stones on plain moss).

## How it measures up to the HoMM II bar

- **Mars: a clear step up, not the bar.** The dust is no longer one colour
  and the rocks are shaded, of several shapes and sizes, each whole. It
  reads as Mars at board size and stays calm under the units. Against HoMM
  II it lacks large-scale variation (no drifts, no darker reaches: the dust
  is one speckle from edge to edge), the rocks are still mostly rounded
  (the fields gave few slabs and shards), and no crater or ripple came out
  of any field asked for them.
- **Dwarves: the direction reads, the material is thin.** Stones with moss
  on them in mottled moss is recognisable, and no one will take it for the
  Mountain rock. But it is stones _in_ moss, not a bed of mossy cobbles:
  Pixflux would not draw the packed bed, so the density is the strewing's,
  and the moss is a dither rather than a painted surface. It is close in
  value to the default Grass (58% against 62%) and differs by being greyer.
- **Marsh: recognisable and too busy.** Sedge on every few pixels fights
  the teal Horror, frog and willows, and the water arrives as cut-off
  reaches, because a field's stream cannot be quilted without its banks.
  The published bog (olive peat, puddles, reeds) is the calmer ground. A
  marsh needs sparser sedge and pools small enough to strew.
- **In general.** The pixel density and the hand of the fields are right;
  what is missing is composition at the scale of several cells, which
  HoMM II's hand-made tile sets have and a quilt of a 160 px field cannot.

## On the board

A textured ground is an asset of `FACTION_GRASS_TILES_V7` with `world: {
columns, rows, swatchUrl }`
([`faction-grass-manifest.ts`](../../src/assets/faction-grass-manifest.ts)),
baked by `npm run art:faction-grass -- bake` from the look marked `chosen`
(`WORLD_GROUND_IDS` of `scripts/art/faction-grass.ts`; `check`, in
`art:validate`, re-derives it):

- `faction-grass/world/chibi-<faction>-ground.png`, the texture;
- `faction-grass/chibi-<faction>-grass-1.png`, its first cell as a tile of
  its own (the **swatch**): what the Gallery's Terrain tab, the tile dock
  and the forest bake show of the ground, each of which wants one 80 x 80
  file.

- **Cells.** The texture is read once and cut into its cells; `art.tile`
  and `art.spill` take the cell's place and return the cached surface of
  that part. A ground of tiles ignores the place.
- **Borders, spill and fog.** Unchanged: a ground still spills into a
  paler neighbour through the same irregular mask, now filled with the
  texture at the neighbour's own place, so the texture runs on under the
  spill; the fog and its fringe are drawn over the terrain as before.
- **Period.** Six cells a side (480 px), and eight (640 px) for the
  regolith. On a bare 16 x 16 territory of regolith a boulder that came
  back every six cells was seen as a lattice of the same boulder; at eight
  it comes back twice a side and is not picked out. The moss-covered
  stones are dense and alike, and no repeat is seen at six. A second, slow
  layer of tone was not tried: the period, not the tone, was what showed.
- **Memory.** A cell is 80 x 80 x 4 bytes, 25.6 kB, held twice (the pixels
  a spill is cut from, and the surface drawn): 1.8 MB for a ground of
  6 x 6 cells and 3.3 MB for one of 8 x 8, where a ground of six tiles
  holds 0.3 MB. The board loads every ground whoever plays, so nine
  textured grounds at six cells would be about 17 MB, at eight about 30 MB.
  The files themselves are 52 and 53 kB.
- **Draw time.** The same draw calls: one cached image a cell. Measured in
  the real game over a 16 x 16 map of one faction's land, 400 redraws,
  three rounds, the commit before against this one
  ([`draw-timing.ts`](../../scripts/art/textured-grounds/draw-timing.ts)):
  Martian 0.60 to 0.73 ms a redraw with tiles and 0.59 to 0.63 ms
  textured; Dwarf 0.60 to 0.61 ms and 0.60 to 0.61 ms. No difference
  outside the noise. (`scripts/benchmark-board-presentation-v7.ts` fails
  on main, "No glow surface for the byte-limit comparison", so it gave no
  number; its fixture test is green.)

The `?textured-grounds=1` switch of the experiment is gone.

## Rolling it out

For each ground, and for the default Grass:

1. Three to six fields at 160 px until two hold clean ground and two hold
   separate things (about half of the fields are scenes and are rejected).
2. A look: the regions of clean ground, the kinds of thing and how many a
   cell, the board colours.
3. Its texture in `faction-grass/world/`, the asset in
   `faction-grass-manifest.ts` with `world`, the inventory and the tests'
   counts; the six tiles go.
4. The forests baked again (their foliage is lifted toward the ground's
   first tile: it needs a tile cut from the texture), the Gallery and the
   tile dock given a cell of the texture, the review scenes.

Open before that: whether 480 px is a long enough period on a large
territory (a boulder comes back every six cells; 640 px costs 64 surfaces a
ground), and large-scale variation, which wants a second, slower layer of
tone over the quilt.
