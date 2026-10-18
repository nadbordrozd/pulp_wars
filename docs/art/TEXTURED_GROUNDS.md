# Textured grounds

**Bead:** `pulp_wars-2yc.48`. **Status:** in use. The user, 2026-10-13, on
the samples of this page: "the textured terrain is great. use it. make a
note to investigate the tileset endpoint at pixellab but this is already
acceptable." (The tileset endpoint is bead `pulp_wars-2yc.50`.)

**Textured now:** the Martian regolith and the Dwarf moss-covered stones
(stage 1), and the default Grass, the Undead burnt ground and the Dinosaur jungle
floor (stage 2, below), and the Goblin dry grass (bead `pulp_wars-2yc.53`,
[below](#goblins-dry-grass-bead-pulp_wars-2yc53)). The other grounds are
tiles until each has a texture that is clearly better than what is
published ([faction grass](FACTION_GRASS.md)).

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

| Method                                                                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) One large field from PixelLab**, made periodic                   | **Failed at the first step.** At 400 x 400 Pixflux does not hold a texture: `martian-regolith-a` is a canyon mouth over evenly striped dust, `dwarf-moss-a` rows of one identical stone on flat green. A painted texture comes only at about 160 px.                                                                                                                                                                                                                                                                                                                                                                                              |
| **(a') A large texture quilted in code from 160 px fields**, WORLD     | **Works; the method above.** Seamless everywhere by construction; repeats every 480 px.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Quilting fields that hold dust and rocks together                      | **Failed.** The nearest window is always the emptiest dust (its join costs nothing), and the texture ends flat with one pebble; with a random draw it is a patchwork of two dusts. Hence two layers: quilt the ground, strew the things.                                                                                                                                                                                                                                                                                                                                                                                                          |
| **(b) PixelLab's own tileset or seamless option**                      | **Tried since (bead `pulp_wars-2yc.53`): see [PixelLab's tileset endpoint](#pixellabs-tileset-endpoint-bead-pulp_wars-2yc50); its one interior tile a terrain repeats as a lattice.** At first **not available to the pipeline.** The client (`scripts/art/chibi/batch-manifest.ts`) knows `create-image-pixen`, `create-image-pixflux`, `edit-image-pixen` and `generate-image-v2`; none has a seamless option, and it sends no init or mask image, so no inpainting over a seam. The published OpenAPI names a `create-tileset` (Wang tiles for transitions between two terrains, a background job); it was not added on a guess of its schema. |
| **(c) Tiles that all share one border band**, quilted inside it, TILES | **Works less well.** Any tile joins any other, so the board may pick at random as it does now, but the shared band comes back on every cell edge (a faint lattice), a thing can never cross an edge, and the cut may replace band pixels, so two tiles' edges agree only nearly. It is look C of the Martian and Dwarf sheets.                                                                                                                                                                                                                                                                                                                    |

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

## The default Grass

The most-seen ground: neutral land and the Humans' (`NEUTRAL` in
`FACTION_GRASS_TILES_V7`; it is no faction's and loads with the shared
art). Its texture is the same green as the Grass tile, `#8ab85c`, with a
faint mottle of two near tones quilted from `neutral-grass-b` and the
small tufts of `neutral-grass-a` strewn over it in today's tuft greens,
eight cells a side. Three looks were compared (A, tufts on flat green; B,
the mottle alone; C, both) and C was taken: the map keeps its colour, and
a large meadow is no longer the same three tiles.

- **Where it is drawn.** `drawFactionGrassV7` draws it on every Grass,
  Forest, Mountain and Rift cell with no faction ground, over the Grass
  tile and under the spill of a neighbouring faction ground; a faction
  ground stays ranked above it, so the borders are as they were. Water and
  fog are untouched.
- **The Rift** (bead `pulp_wars-2yc.102`): its pieces carry their own grass
  in the master, so the art resolver cuts each piece to its crack (every
  green pixel reached from the piece's edge made transparent), and the
  board draws the crack over the cell's ground: a faction's ground or this
  one, sampled by map place like the cells round it.
- **Left on the old Grass tile:** the pictures of plain Grass outside a
  live match (the title screen, the Help pages). The Gallery's Grass row
  and the tile dock show a cell of the texture.
- **Period.** A 16 x 16 map of neutral Grass shows no repeat at eight
  cells.
- **Draw time.** One more cached image for each neutral grassy cell, where
  there was none. The same measure as above, the stage 1 commit against
  this one: a 16 x 16 map of neutral Grass 0.42 to 0.45 ms a redraw before
  and 0.54 to 0.55 ms after; Martian 0.62 to 0.70 ms and 0.60 to 0.71 ms;
  Dwarf 0.59 to 0.60 ms and 0.56 to 0.58 ms. Neutral land now costs what a
  faction's land costs, and less than the textured faction grounds'
  0.6 ms.
- **Memory.** 3.3 MB (8 x 8 cells), a 68 kB file.

## Stage 2: ground by ground

Each ground got a field or two, a look and a sheet beside what is
published (`npm run art:textured-grounds -- sheet <FACTION>`), and was
wired only where the texture was clearly the better ground.

- **Undead: wired.** `undead-burnt-world`: the ash of the published tiles
  mottled with three paler tones (field `undead-burnt-a`), and the same
  twigs, burnt bushes, lumps and embers, from the fields of the tiles,
  strewn over the whole texture. The tiles were a flat grey with things on
  it; this is ash everywhere. At six cells a side the same lump and ember
  came back in rows on a 16 x 16 territory, so it is eight cells (3.3 MB,
  a 55 kB file). The masters under it and the wash keep their colours.
- **Dinosaurs: wired.** `dinosaur-jungle-world`, quilted from
  `dinosaur-jungle-a`: a darker, bluer green than the Grass, mottled with
  moss, a little leaf litter and low plants. The published ground was the
  Grass tile recoloured, with ferns, and read as the same meadow in
  another green beside Human land; this one is a different surface. It is
  dense and alike all over, and a 16 x 16 territory shows no repeat at six
  cells (1.8 MB). The Gallery calls it "Jungle floor". It was the last
  recoloured ground: `FACTION_GRASS_RECIPES` is empty.
- **Cult: the published bog stays.** Two more fields were generated.
  `cult-peat-a` with the puddles and reeds of the bog's own fields strewn
  over it (`cult-peat-world`) gave the same teal mounds again and again,
  busier than the bog and no clearer; `cult-pools-a` was pits in rows and
  is rejected; the marsh of the first samples (`cult-marsh-world`) is a
  good picture and too loud under units. The six bog tiles, the user's
  "clearest improvement", are the better ground.
- **Goblins: the published savannah stays.** `goblin-savannah-world`
  (speckled dry ground from `goblin-savannah-t`, the tiles' tufts strewn)
  is a little grainier than the six tiles and otherwise the same picture:
  not clearly better, so not worth 1.5 MB more. (Superseded on 2026-10-14
  by the dry grass, below: the tiles were "just uniform yellow with very
  little on it".)
- **Candy: the published frosting stays.** The one field asked for,
  `candy-frosting-t`, was a plaque of frosting with a piped border, an
  object and not a ground; rejected. Frosting is smooth by nature: flat
  mint with sprinkles is what it should be.
- **Ice Folk: none.** Their land is Snow by rule, drawn by the Snow
  overlay, not by a ground of this module. `ice-folk-snow-a` was a blank
  white field; rejected.
- **Humans:** the default Grass, above.

After stage 2 the board holds five textures (three of 8 x 8 cells, two of
6 x 6): 13.5 MB, where the same five grounds as tiles held 1.2 MB; the
three grounds of tiles hold 0.9 MB. Draw time, the stage 1 commit against
the last of stage 2, same measure: Undead 0.67 to 0.73 ms a redraw before
and 0.72 to 0.74 ms after; Dinosaur 0.59 to 0.63 ms and 0.59 to 0.63 ms;
neutral Grass as said above.

## Goblins: dry grass (bead `pulp_wars-2yc.53`)

The user, 2026-10-14: "The goblin terrain looks bad. just uniform yellow
with very little on it. it was supposed to be dry grass. figure out how
to make it look good. consider pixellab tileset endpoint or just
generating a bunch of dry grass decorations with pixellab and then
pasting them on top of the yellow tile at random places." Both were
tried; the decorations won.

**Wired: `goblin-dry-grass-b`**, 8 x 8 cells (3.3 MB in memory, a 99 kB file):

1. **The straw** is quilted from `goblin-savannah-t` as before, in the
   same board colours (`#d3c176` the ground).
2. **Drifts** ([`drift.ts`](../../scripts/art/textured-grounds/drift.ts)):
   a smooth periodic field (a sum of cosines of whole frequencies, so it
   wraps with the texture) splits the straw into soft reaches a few cells
   across, three tenths of it a paler sun-bleached straw and three tenths
   a darker golden one. A pixel takes its colour from one of three board
   palettes, never a blend; the edge of a reach is a dither of single
   pixels. This is the large-scale variation the quilts lacked; five
   fields asked of Pixflux for a mottled mat came back framed, striped or
   with a path through them (`goblin-straw-b` to `-e`, rejected).
3. **Pieces**, each a separate thing cut whole from a field of separate
   things on plain straw, as the Dwarf stones were: tall dry tufts of
   several sizes (`goblin-tufts-a`, with its pale ring round each tuft
   counted as ground; `goblin-tufts-b`, two wispy ones), golden seed-head
   clumps (`goblin-seedheads-b`), round dry scrub and loose sprigs
   (`goblin-scrub-a`, whose field had a path through it; only the pieces
   apart from it are cut), golden specks, and bones (`goblin-bones-a`).
   About 60 pieces in all. Per cell, on average: 0.4 large tufts, 1.1
   tufts, 0.5 seed-head clumps, 0.3 scrub, 0.15 wisps, 0.06 bones, 2.5
   sprigs, 2 specks ([`looks.ts`](../../scripts/art/textured-grounds/looks.ts),
   `goblinDryGrass`).
4. **Where they lie** ([`compose.ts`](../../scripts/art/textured-grounds/compose.ts)):
   - `clear`: no pixel of a tall piece within 16 to 24 px of a cell's
     centre, where a unit stands; the tall grass keeps to the edges and
     corners of the cells.
   - `gather`: the tall pieces gather in the darker drifts (0.8 to 0.9),
     so the grass is thick in some reaches and thin in the paler ones.
   - `whole`: no piece crosses the edge of the texture's first cell, the
     swatch the Gallery, the tile dock and the forest bake show alone.
     Everywhere else a piece may cross a cell edge: the board samples the
     texture by map place, so the next cell continues it, and where the
     Goblin land ends the spill's irregular edge cuts it, as it cuts the
     ground.
5. **Colours.** The darkest browns of the pieces are lifted
   (`#6b5428` to `#8a7236`, `#93742f` to `#a68a40`) so the ground stays
   calm: luma spread 8.6% (the other textures 3 to 5.6%; the test allows
   the Goblin ground 9%, a field of separate tall tufts being the point).

Rejected on the way: a skull (`goblin-bones-a`'s horned skull), lovely
alone, came back as a square lattice of the same skull every eight cells
on a bare 16 x 16 territory, so only sample D has it. Cracked earth: three
fields asked for flat patches of cracked mud gave rings in a frame and two
sets of boulders (`goblin-cracks-a` to `-c`, rejected), so there is none.
`goblin-seedheads-a` was a wheat field round a clearing.

**Samples** (`npm run art:textured-grounds -- sheet GOBLIN <out.png>`,
beside the tiles of main): A the old savannah texture; **B** the chosen;
C the same at six tenths; D at 1.4 with a skull; E B without drifts; and
the two tilesets below. B over C: C is calmer but reads as the old flat
yellow from a distance; D crowds the move highlights. B over E: the
drifts are what keep a large Goblin land from being one even carpet.

**On the board.** The scrub wood was baked again (25 files: its foliage
is lifted toward the ground's first cell). Review in the real game:
`scripts/art/textured-grounds/goblin-review-scenes.ts` through
`look-switch-review.ts` (desktop, selected, phone and a 16 x 16 field,
against main). Draw time over a 16 x 16 Goblin field, 400 redraws, three
rounds, main against this: 0.61 to 0.73 ms a redraw with the six tiles,
0.59 to 0.65 ms textured (Martian, unchanged, 0.60 to 0.66 ms on both):
no difference outside the noise.

## PixelLab's tileset endpoint (bead `pulp_wars-2yc.50`)

Read from PixelLab's OpenAPI (`https://api.pixellab.ai/v2/openapi.json`,
2026-10-14) and its tool page
(`https://www.pixellab.ai/docs/tools/create-tileset`), and now in the
checked-in client
([`tileset-client.ts`](../../scripts/art/chibi/tileset-client.ts),
recipes and the world layout in
[`tilesets.ts`](../../scripts/art/textured-grounds/tilesets.ts)):

- **`POST /v2/create-tileset`** takes `lower_description` and
  `upper_description` (both required), `transition_description`, `mode`
  (`standard`, or the experimental `pro`), `tile_size` (16 or 32, and 64
  with `pro`), `transition_size` (0, 0.25, 0.5 or 1: under `pro` the
  height of the upper terrain, 0 flat), `view` (`high top-down` or
  `low top-down`), `outline`, `shading`, `detail`, `text_guidance_scale`,
  `color_image` (a forced palette), `seed`, reference images per terrain,
  and border shape controls (`shape_style` for standard; `raggedness`,
  `roundness`, `boundary_amplitude`, `boundary_seed`, `step_slope`,
  `connect_diagonals` for pro). It answers at once with
  `background_job_id` and `tileset_id`; the job is polled at
  `GET /v2/background-jobs/{id}` and the tiles read from
  `GET /v2/tilesets/{tileset_id}` (HTTP 423 while it is being made).
- **Output:** 16 Wang corner tiles (25 with `transition_size` 1), each a
  base64 PNG with its `corners` (NW, NE, SW, SE: lower or upper) and a
  `pattern_4x4`. A map is a grid of vertices, one terrain each; a cell
  takes the tile whose corners match its four vertices.
- **What it cost here:** the standard set of 32 px took 113 s and
  $0.007; the pro set of 64 px 144 s and $0.15.

`npx tsx scripts/art/textured-grounds.ts tileset-generate <recipe>` (calls
PixelLab), `tileset-contact` and `tileset-world` (a texture laid from the
set over a periodic noise of vertices, about three tenths bare earth).
Two dry grass and cracked earth sets were made
(`art/explorations/textured-grounds-2026-10/tilesets/`):

- **`goblin-tileset-a`, standard, 32 px:** two near-flat straws, a thin
  outline along part of the border, and the speckle of the one full tile
  of each terrain repeating every 32 px as a visible grid. Unusable.
- **`goblin-tileset-b`, pro, 64 px:** a real painted dry grass and a
  convincing cracked earth with pebbles, and a ragged, natural border:
  the best single painting of any PixelLab ground so far. But each
  terrain has exactly **one** full tile, so the grass is the same 64 px
  square of tufts in a lattice over every cell, and the saturated yellow
  and brown are loud under units.

**Verdict.** The endpoint makes transitions between **two** terrains;
it is not a way to make one large ground, because the inside of each
terrain is one tile repeated. Worth using for (a) a border between two
grounds or a terrain and its patches (coast, a road or a burnt patch),
where the set's ragged edges are better than the spill's, or (b) as a
source of fields to quilt (the pro set's painted grass is good material),
not as a faction ground by itself.

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

The period: a ground of few, distinct things (regolith, burnt ground)
wants eight cells a side, since the same boulder or ember every six cells
is picked out on a 16 x 16 territory; a dense ground that is alike all
over (mossy stones, jungle floor) is fine at six. The default Grass has
eight because it is everywhere. A second, slower layer of tone over the
quilt was not needed at these sizes and was not tried.
