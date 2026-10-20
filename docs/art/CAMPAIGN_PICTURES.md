# Campaign pictures

**Bead:** `pulp_wars-hmyk.13` (the last step of the faction campaigns epic
`pulp_wars-hmyk`). The user: each campaign "represented by a picture and
the unavailable ones greyed out", "sort of like in homm 3", made with
PixelLab.

## What they are

One small opaque scene per campaign, ten in all: the prologue and the nine
faction campaigns of the [saga](../product/SAGA.md). Each shows the
campaign's protagonist or emblematic place, in the house
[bold chibi](ART_DIRECTION.md) pixel style, in the spirit of the small
painted scenes of the Heroes of Might and Magic III campaign screen.

| Campaign                   | Picture                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| The Hollow Frontier        | a Ranger guard before the birch-log fort, the mountain glowing green |
| Humans, The Marshal's Law  | Marshal Steele rides up the road to Kessler Hall                     |
| Undead, The Long Sleep     | the Ashen Marquis sits up in his coffin with the Lullaby             |
| Dinosaurs, The Egg Thief   | the Old Queen over her nest of eggs on the island                    |
| Martians, Signal from Home | Captain Quaxx's saucer over the red desert, the dish signalling home |
| Goblins, The Big Score     | Grubnak's crew wheel the stolen vault away from the fort             |
| Dwarves, The Bottomless    | the Thane with a lantern at the lip of the Bottomless                |
| Ice Folk, The Long Winter  | Mother Rime on the frozen summit                                     |
| Cultists, The Long Night   | the Lodge's meeting at the lip of the shaft, the Eye looking up      |
| Candy, Sweet Dreams        | Queen Praline before the Dreaming Palace under the night sky         |

The cultists are ordinary men in blood-red hooded robes; the Eye in the
shaft is the otherworldly part.

## Geometry and display

- **Canvas:** 128 x 96 (4:3), opaque, generated at that size. Masters in
  `public/assets/chibi/campaign/campaign-<id>.png`.
- **A tier's plate** shows it 1:1 (8rem) and shrinks it to the plate's
  width when narrower (three across a phone, about 0.65x). The prologue's
  wide plate shows it 1:1 beside its title.
- **A mission list's head** shows it 1:1, and 2x (16rem) on a screen 48rem
  or wider.
- `image-rendering: pixelated`, in the portrait's ink frame.
- **Locked and coming soon** plates grey it (`grayscale(1)`, opacity 0.55)
  and keep the lock badge, as they did the placeholder portrait.
- **Fallback:** a picture that fails to load gives way to the faction's
  placeholder portrait on its framed plate, and stays given way for the
  session (`#campaignPicture` in `src/render/dom/app-view-v7.ts`).
- **Preload:** the pictures load with the shared art in the FRONT tier
  (`src/assets/asset-inventory-v7.ts`): the campaign map is a screen before
  any match. The placeholder portraits of campaigns with a picture left the
  FRONT tier for their factions' tiers.

## Pipeline

`scripts/art/campaign-pictures.ts` (its own small pipeline, like the
mountain ranges', because the batch pipeline makes transparent sprites at
a class canvas):

```text
node node_modules/.bin/tsx scripts/art/campaign-pictures.ts plan
node node_modules/.bin/tsx scripts/art/campaign-pictures.ts prompt <id>
node node_modules/.bin/tsx scripts/art/campaign-pictures.ts generate <id>...
node node_modules/.bin/tsx scripts/art/campaign-pictures.ts review <out.png> <id|file>...
node node_modules/.bin/tsx scripts/art/campaign-pictures.ts bake
node node_modules/.bin/tsx scripts/art/campaign-pictures.ts check
node node_modules/.bin/tsx scripts/art/campaign-pictures.ts sheet <out.png>
```

- **Recipes:** `scripts/art/campaign-pictures/recipes.json`. Endpoint
  `generate-image-v2` (four candidates per call at this size, US$0.08),
  `no_background: false`, a seed per recipe (the endpoint is not
  deterministic). The description is layered: `style.txt`, the light layer
  (`light-south-west.txt`), the shared picture class text (`klass`), the
  subject, then the negative terms (text, letters, frames, borders, panels
  and the style fragment's own). At most 2000 characters.
- **Reference images:** each recipe sends the game's own sprite of its
  protagonist (the Human Knight, the Undead Vampire, the Dinosaur T-Rex,
  the Martian Saucer, the Goblin Orc Warboss, the Dwarf Engineer, the Ice
  Witch, the Cult Initiate, the Guard; the Candy city 3 for the palace) as
  a `reference_images` entry, so the picture keeps the faction's look.
- **Records:** `scripts/art/campaign-pictures/records.json` keeps the
  credential-free request, the job id, the cost and the hash of every
  candidate; raw candidates are under
  `art/pixellab/chibi-raw/campaign-pictures/`. `generate` never repeats a
  recorded recipe.
- **Review:** each recipe's `review` block records a verdict for every
  candidate; the `pictures` block names the accepted candidate per
  campaign.
- **Bake:** copies each accepted candidate pixel for pixel to its master and
  writes `src/assets/campaign-pictures.json`, the runtime manifest's data
  (`src/assets/campaign-pictures-manifest.ts`). `art:validate` re-derives
  both and checks every recorded candidate (`campaignPictureProblems`).

## Generation (bead `pulp_wars-hmyk.13`)

13 calls, 52 candidates, US$1.04. One call per campaign first; three
campaigns got a second recipe:

- **Martians:** in `martians-a` the saucer was small in a crater, red on a
  red sky; `martians-b` asks for the saucer a third of the picture wide and
  a purple night sky.
- **Cultists:** in `cult-a` five small figures read poorly on a phone;
  `cult-b` asks for three men big in the foreground, lit green from the
  shaft.
- **Frontier:** `frontier-a` was flatter and plainer than the rest of the
  set; `frontier-b` brings the guard forward and adds pines.

Every candidate was inspected at native size, at the phone plate's size
and enlarged 3x; the verdicts are in `recipes.json`.
