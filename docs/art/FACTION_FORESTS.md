# Faction forests

**Bead:** `pulp_wars-2yc.2`. The user, 2026-10-05: "make per-faction forests
the way there is per faction grass."

In the live look of the CHIBI art set, a Forest cell inside a faction's
territory is drawn with that faction's own trees, on that faction's ground,
and turns with the territory when a city changes hands. Presentation only:
no rule, number, save or identity changed. The classic look and the LEGACY
art set are unchanged.

## Turning it off

| To                          | Do                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Look at the game without it | Open it with `?faction-forests=0` (also `off`, `false`). `?faction-forests=1` forces it on.                              |
| Switch it off for everyone  | Set `FACTION_FORESTS_ENABLED_V7` to `false` in [`faction-forests-v7.ts`](../../src/render/canvas/faction-forests-v7.ts). |

With the switch off the board plan carries no `factionForest` member, the
board host builds no faction art, and every Forest is drawn as before.

## The forests

| Faction   | Forest                                                                                                                                                   | Clumps | Softening |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- |
| Humans    | The default Forest.                                                                                                                                      | 4      | default   |
| Undead    | A dead wood (bead `pulp_wars-2yc.14`): thick gnarled trunks of ashen grey bark with clawed bare branches, broken stumps and a few pale cobwebs.          | 4      | calmer    |
| Goblins   | Scrub: crooked half-dead trees with sparse olive leaves, dry twig bushes, sawn stumps.                                                                   | 4      | calmer    |
| Dinosaurs | Jungle: leaning palms, cycads and fern fronds in deep greens.                                                                                            | 3      | default   |
| Martians  | Alien growths: red-ochre fungal stalks with teal caps and teal bulbs at the foot.                                                                        | 3      | calmer    |
| Dwarves   | Sturdy dark pines among mossy grey boulders.                                                                                                             | 3      | default   |
| Candy     | A candy grove, no trees: striped candy canes, caramel and raspberry swirl lollipops, chocolate sticks and gumdrop bushes (bead `pulp_wars-2yc.13`).      | 4      | default   |
| Ice Folk  | None of their own. Their territory is Snow by rule, and the snow caps the board already draws on every tree over Snow make the default pines snow-laden. | n/a    | n/a       |

Each faction's forest is a whole piece set of the
[composed forests](COMPOSED_FORESTS.md): the same twenty piece shapes (three
variants each of 1x1, 2x1, 1x2 and 2x2, two of each L) and one seam clump
per clump, packed and drawn by the same code. So the footprint, the 24 px
band above a piece, the glade under a resource, the snow caps and the rule
that a clearing keeps a single clump are the default Forest's.

### How the sets are made

The clumps are PixelLab candidates: 14 calls, 4 candidates each, 21 used.
The recipes, the credential-free requests, the hash and the review of every
candidate are in `art/pixellab/faction-forests/` (`recipes.json`,
`records.json`, `raw/`), made with the style-image generator of the mountain
pipeline:

```sh
MOUNTAIN_RANGES_RUN=art/pixellab/faction-forests npx tsx scripts/art/chibi-mountain-ranges.ts plan
MOUNTAIN_RANGES_RUN=art/pixellab/faction-forests \
  node node_modules/.bin/tsx --env-file=<file> scripts/art/chibi-mountain-ranges.ts generate <id>...
npm run art:faction-forests -- bake
npm run art:faction-forests -- check      # also in art:validate
npm run art:faction-forests -- lighting
npm run art:faction-forests -- sheet <out.png>
```

- **Style.** The Undead, Goblin, Dinosaur and Dwarf clumps were styled from
  the default Forest clump (`chibi-forest-1.body.png`), so scale, outline
  and shading match it. The Martian and Candy clumps were made without a
  style image, because the generator copies the style image's palette; the
  words alone gave the same pixel density and outline weight. The second
  Undead and Candy calls were styled from an accepted clump of their own.
- **The Undead set was redone** in bead `pulp_wars-2yc.14` (the user,
  2026-10-06: "make undead ... forest more spooky"). The first set
  (`undead-a`, `undead-b`: thin brown twigs with dark tufts) is superseded;
  its candidates stay in the run. `undead-c` (no style image, so the brown
  is not copied) gave the look, but its four clumps measure lit from the
  right, the pale cobwebs hanging on that side. `undead-d` names the light
  per trunk and puts the cobweb on the left: three of its clumps are used.
  `undead-e`, styled from `undead-c-0`, gave the fourth. A description is
  at most 2000 characters; a longer one is refused by PixelLab.
- **The candy grove** (bead `pulp_wars-2yc.13`; the user, 2026-10-06: "make
  candy forest into candy canes and lollipops and such"). Recipes
  `candy-c`, `-d` and `-e` replace the sweet trees of `candy-a` and `-b`,
  whose candidates stay in the run but are no longer used. The palette is
  caramel, dusty raspberry, cream and chocolate, with no mint (the ground
  is mint) and no pink on white. A clump of three canes was left out:
  packed, its stripes made a busy thicket. Two of the four clumps carry one
  striped cane each.
- **Light.** Every recipe carries the fragment `light-south-west` (the sun
  at the bottom left, the user 2026-10-05). **Nothing is mirrored**: a
  mirrored clump is lit from the other side. The default set still stamps
  its clumps both ways; that is unchanged here.
- **Lighting QA.** `scripts/art/lighting-qa.ts` measures every clump (left
  half minus right half of every run of paint, in luma points). The bake
  refuses a clump lit from the right (-1.5 or less). The 21 clumps measure
  -1.5 to +30.5: 14 from the left, 7 flat, none from the right (the Undead
  four: +0.1, +5.5, +4.9, +3.9). On foliage
  the measure is weak (the default clumps themselves measure -4.9 to +5.0)
  and on sweets of two colours it reads colour as light (three of the
  candy grove's four clumps are flat on it): five of its twelve candidates
  were left out on it all the same.
- **The bake** is the default Forest's
  ([`chibi-forest-pieces.ts`](../../scripts/art/chibi-forest-pieces.ts),
  now with a piece set as a parameter): a raw candidate is trimmed and
  stood where a clump stands (at most 78 x 86 px), stamped at 1:1 on the
  same lattice with the same seeds, and softened by the same recipe, its
  foliage lifted toward the faction's own ground tile.
  `art/pixellab/faction-forests/sets.json` names each set's clumps.
- **Calmer softening.** Bare branches, twig scrub and fungal stalks are
  thin shapes, so nearly every outline pixel is silhouette and the default
  softening leaves them busy. The Undead, Goblin and Martian sets leave out
  30% of the clumps in larger pieces (default 18%), lift 24% toward the
  ground (default 16%), and move the outer outline 30% toward the ground,
  which the default set never does.

The masters are in `public/assets/chibi/forest/<faction>/` (141 files), the
record and runtime manifest is `src/assets/faction-forest-pieces.json`, and
the preload inventory lists each set with its faction.

## On the board

A terrain plan entry of a Forest cell inside the territory of a faction
with a forest carries `factionForest: <FACTION>`
(`factionForestPlanMemberV7`). The board draws through one forest art
object ([`faction-forests-v7.ts`](../../src/render/canvas/faction-forests-v7.ts))
that has the faction sets behind the default one:

- **Packing stops at a border.** The Forest cells of each faction, and the
  default Forest, are packed as forests of their own. No piece and no seam
  clump spans two territories, so a wood that crosses a border changes
  trees exactly on it.
- **The shade is the faction's.** The veil under the trees takes a dark
  tone of the faction's ground (`FACTION_FOREST_FLOOR_V7`), where it was
  the default dark green on every ground. It is cut back along a border as
  it is at the edge of a wood.
- **Glades** show the cell's own ground, the faction grass included, as
  before.
- **Captures.** The plan follows `territoryOwnerId`, so a cell changes
  trees in the same redraw as its border. A faction's set is loaded when a
  plan first shows its Forest; until it is ready (and for good if it fails
  to load) its cells draw the default Forest.
- **A clearing wears the faction's trees too** (bead `pulp_wars-2yc.28`).
  A Forest cell with a Treasure, a curiosity, a Grave, a Field Defense or
  a building on it kept the default Forest's single clump inside every
  faction's wood, so the wood did not change skin under whatever stood on
  it (the user, 2026-10-07: "forests don't always switch skin straight
  away when a new faction takes over. I think it happens when something is
  standing on the forest like an animal"). Such a cell now draws one
  single piece (1x1) of the faction's set, with no seam clump and no
  glade. A clearing of the default Forest keeps the clump it always drew.
- **Fog.** The entries of unexplored cells are never read. Where a wood
  runs into the fog its pieces are packed with the map's own Forest cells
  behind the cloud and drawn only over explored cells:
  [TERRAIN_AT_THE_FOG.md](TERRAIN_AT_THE_FOG.md).
- **A capture ripples.** The cells change one after another, each with a
  small hop: [TERRITORY_RIPPLE.md](TERRITORY_RIPPLE.md).

The Gallery's Terrain tab shows each faction's forest in the Forest row: a
single piece on the faction's ground, then every piece and seam clump of
its set. The title scene keeps the default Forest.

## Review

```sh
npx vite --port 6593 --strictPort &
CHROME_PATH=... npx tsx scripts/art/look-switch-review.ts scripts/art/faction-forests/review-scenes.ts <out-dir>
```

Before and after pairs: for each faction, its forested territory beside the
Human one with a wood across the border, and an eight-seat map.

## Known limits

- **A clearing is one single piece.** A Forest cell with a Treasure, a
  Grave, a curiosity, a Field Defense or a building draws a 1x1 piece of
  the faction's set (one or two clumps), not a clump chosen for it. A
  Lumber Camp's own art still has the default pines.
- **The Undead and Goblin forests are the busiest.** Bare branches and twig
  scrub are many thin lines; even softened they are less calm than a
  canopy. The Undead trunks are thicker than the first set's twigs, but a
  large wood is still a tangle of branches.
- **The Undead trees are a cold lilac grey.** The softening lifts a set
  toward its ground tile's master colours, and the Undead master is toned
  by the board afterwards (its master base is `#7a8a9d`, the board's
  `#7f9a86`). The trees stand off the grey-green ground by that tint.
- **The mist did not come.** The recipes ask for a wisp of mist round the
  roots; the used clumps have pale feet at most.
- **The Candy grove is the lightest**, and its caramel is near the
  Candy units' own toffee; the softening keeps it paler than they are.
- **Fewer clumps than the default set draws from** (three or four, never
  mirrored, against four mirrored), so a large wood repeats sooner.
- **The Ice Folk have no set.** Their forest is the default one under snow
  caps.
- The Undead ground under their trees is the Undead terrain tile (the
  ashen ground, see [faction grass](FACTION_GRASS.md)), and the shade under
  them is the default dark green.
