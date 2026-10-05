# Mountain style options

**Bead:** `pulp_wars-2yc.1`. **Status:** options for the user to pick from.
Nothing here is production art and nothing in the game changed.

The user, 2026-10-05, after three passes on the mountains' structure: "makes
mountains prettier. the current ones are just ugly." The massif system
(low and tall pieces, the cover, Mines) stays; the look of the pieces is the
question. This run holds small sample sets of three styles and one
treatment of today's pieces that needs no new art.

| Option            | Look                                                                                                                                          | Calls to convert |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| A. Storybook      | Rounded warm brown-grey mountains, cream snow caps, ledges, dark brown outlines, pines and bushes at the foot, on meadow instead of grey rock | about 14 to 18   |
| B. Painted alpine | Sharp blue-violet peaks in broad smooth planes, large snowfields, indigo outlines, on pale misty blue ground                                  | about 14 to 18   |
| C. Mesa and crag  | Flat-topped ochre mesas and stepped towers with slate-blue shadow faces, no snow, on sandy ground                                             | about 12 to 16   |
| D. No new art     | Today's pieces redrawn by code: slate outlines, warmer rock, cream snow, a green skirt at each foot, meadow instead of the grey ground        | none             |

`notes.json` says, for each option, how it would handle faction ground,
Snow, Mines and the tall and low rule; the review prints those notes on
each board.

## What is here

- `recipes.json`, `records.json`, `raw/`: the 17 PixelLab calls of the run,
  by the rules of the mountain pipeline (every request a checked-in recipe,
  the credential-free request and the hash of every candidate recorded,
  every recipe reviewed or rejected in place).
- `style/`: style images composed from two accepted samples side by side
  (`npx tsx scripts/art/mountain-styles.ts style`).
- `options.json`: which candidates stand for the low single, the low ridge,
  the tall single and the tall ridge of each option, its ground, and how
  the board's ground treatment is set while it is shown.

```sh
MOUNTAIN_RANGES_RUN=art/explorations/mountain-styles-2026-10 \
  npx tsx scripts/art/chibi-mountain-ranges.ts plan
MOUNTAIN_RANGES_RUN=art/explorations/mountain-styles-2026-10 \
  node node_modules/.bin/tsx --env-file=<file> scripts/art/chibi-mountain-ranges.ts generate <id>...
npx tsx scripts/art/mountain-styles.ts sheet <out.png>
npx tsx scripts/art/mountain-styles-review.ts <out-dir>   # a dev server on 6593, CHROME_PATH set
```

The review shows each option in the real game without registering
anything: the browser's requests for the massif pieces and the rocky
ground are answered with the option's derived files, and
`MASSIF_GROUND_V7` is set in the page. It writes one board per option
(beside today's look, at 1x, with the two-by-three block at 3x) and an
overview of all of them.

## What the calls taught

- **No style image is needed to set a look.** `generate-image-v2` with the
  chibi style fragment and a look described in words (rock colours as hex,
  "the outline is a dark tone of the rock, never black") gave four usable
  singles per call in each of the three looks.
- **A stretched style image gives a tall piece** at the sprites' pixel
  density (`a03`, `b03`, `c03`).
- **A style image enlarged to twice its size gives doubled pixels** (`a04`,
  rejected), and a single as the style image of a two-cell request gives a
  ridge 100 px wide (`a02`, rejected). **Two samples side by side at native
  size** as the style image give pieces that fill two cells (`a05`, `a06`).
- **A call can drift in palette**: the `a05` ridges are redder than the
  singles. The mock swaps three colours back; a conversion should force
  the palette.
- **Mist drawn into a piece is cut square by its cell** (`b01`, `b04`).
- A description over 2000 characters is refused (no call is counted).

## Limits of the mock

- Each option has two or three samples per kind, repeated and mirrored
  over the 28 production variants, so a mountain-heavy area repeats more
  than a converted set would.
- Options A and D replace the rocky ground with a meadow tile. In faction
  territory that tile would stay default green; a conversion draws no
  ground tile there at all, so the faction's grass shows.
- The mined mountain's interface master is today's in every option.

## Round 2: one light, from the bottom left

The user on the round 1 boards, 2026-10-05: "generate again while making
sure the lighting is consistent and consistent with everything else in the
game, the sun is in the south west - bottom left". No style was chosen.

**The rule.** In the game's three-quarter view the sun at the bottom left
means: faces turned to the left or toward the viewer are lit, faces turned
to the right are in shadow, snow is brightest on its left side, and a cast
shadow falls up and to the right. It is written into the recipes as the
prompt fragment `scripts/art/chibi/fragments/light-south-west.txt`.
`docs/art/ART_DIRECTION.md` and `docs/art/SQUARE_GRID_EXPERIMENT.md` state
"upper-left lighting" for the square grid: the same side, the other height.
That difference is not settled here.

**The measure.** `scripts/art/lighting-qa.ts` gives two numbers per sprite
in luma points, positive when the light comes from the left: `thirds` (left
third minus right third of the sprite) and `faces` (left half minus right
half of every run of paint between outlines, so each rock face counts).
A sprite is LEFT at `faces` +1.5 or more and RIGHT at -1.5 or less. It
reads one-material forms well (mountains, rocks). On a unit, a building or
a city it mostly reads local colour (a red roof, a shield, a face), so for
those classes it is a list of sprites to look at, not a verdict.

| Class (`public/assets/chibi/...`)         | Sprites | LEFT | FLAT | RIGHT | Read                                                                                                  |
| ----------------------------------------- | ------- | ---- | ---- | ----- | ----------------------------------------------------------------------------------------------------- |
| `mountains` (today's massif set)          | 29      | 21   | 0    | 8     | Reliable. The 8 are exactly the mirrored variants of the bake.                                        |
| `terrain` old single mountains (2 bodies) | 2       | 2    | 0    | 0     | Reliable: lit from the left (faces +42, +52).                                                         |
| `forest` (composed pieces and seams)      | 24      | 9    | 8    | 7     | Mostly flat (mean faces +0.8): each tree blob has its highlight at the top left; no strong side.      |
| `settlements`                             | 38      | 26   | 1    | 11    | Mostly from the left (mean +8.2); the 11 need a look (by eye the Dwarf city 2 is lit from the right). |
| `buildings`                               | 34      | 12   | 4    | 18    | Mixed, and confounded by local colour; by eye the Forge and the Market are lit from the left.         |
| `units`                                   | 143     | 42   | 17   | 84    | Not a verdict: units face right and their pale faces and shields sit on the right half.               |
| `resources`                               | 14      | 5    | 2    | 7     | Mixed; small sprites.                                                                                 |

Unit ground shadows are ellipses under the feet; nothing in the game casts
a directional shadow.

**Nothing is mirrored any more.** Mirroring a piece moves its light to the
other side: that is what the 8 pieces above are, and the round 1 mock did
the same. `deriveOptionWithLighting` repeats the samples unmirrored,
measures every piece and refuses one lit from the right. A conversion
needs every variant drawn, not mirrored.

**The options of round 2** (`options.json`; B and C are retired, their
calls stay as history):

| Option             | Look                                                                                               | Lighting QA            | Calls to convert                            |
| ------------------ | -------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------- |
| A. Storybook       | As round 1, with domes, tors, whalebacks, uneven pairs, twins and broad mountains beside the cones | 27 of 27 from the left | about 16 to 20                              |
| E. Slate storybook | The storybook forms in cool blue-grey slate with white caps: a classic mountain colour             | 17 of 17 from the left | about 18 to 24                              |
| D. No new art      | Today's pieces redrawn by code, using only the 21 that are lit from the left                       | 21 of 21 from the left | none (about 3 to restore the variant count) |

18 more PixelLab calls (35 in the run). What they taught:

- **The light held without effort in most calls**: PixelLab's default for
  this prompt is light from the left. The fragment did not prevent one call
  of four (`e05`, boulder piles) from coming out lit from the right; the QA
  caught it.
- **The palette holds with the anchor as style image and the rock colours
  as hex**, but three calls drifted by a few points (`a14`, `a18`, `e06`,
  `e07`). The mock swaps the drifted colours back exactly; a conversion
  runs the pipeline's palette map over every piece.
- **Shape variety comes from the subject**, not from more candidates: one
  call gives four near-copies of one idea (`a17`, `e08`), so each shape is
  its own call.
- **Long subjects wander**: `e09` returned the same mountain as seasons,
  with a castle and with a campfire; `a13` filled the image and was cut.
- The lighting fragment pushed the description over the 2000 character
  limit twice; the round 2 recipes use a shorter class line (`klass2`).

## Outcome

The user chose "D - no new art" on 2026-10-05. It is the live look since
bead `pulp_wars-2yc.1`: the restyle is in the bake of
`scripts/art/chibi-mountain-ranges.ts` and the massif cells draw their own
ground ([COMPOSED_TERRAIN.md](../../docs/art/COMPOSED_TERRAIN.md)). The
review of this run compared the options with the look before that: its
"today" is no longer what the game draws, and option D would now restyle
pieces that are restyled already. The run stays as the record of the
choice.
