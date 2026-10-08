# Map Curiosity Asset Contract

**Status:** written first in bead `pulp_wars-737.5`, as
[the curiosities spec, section 12.2](../../product/RULESET_7_MAP_CURIOSITIES.md#122-art-pixellab-chibi-direction)
requires, then filled in with what the batch made. It specializes the
[chibi direction](../CHIBI_ART_DIRECTION.md) for the rare neutral features of
the map: the roaming Giant Spider, its lair web, the Fountain of Youth, the
Shrine and the Sunken Wreck, and their small interface and effect pieces.
The UI bead (`pulp_wars-737.6`) wired it into the live look: the board, the
dock, Help and the Gallery draw it
([section 7](#7-how-the-game-draws-it-pulp_wars-7376)). LEGACY and the
Classic look draw code markers instead. Bead `pulp_wars-737.13` added the
round-2 curiosities (the Downed Saucer, the Graveyard, the Dimensional
Gate, the Wishing Well and Bigfoot), registered but not yet drawn by the
game
([section 8](#8-round-2-pulp_wars-73713)).

## 1. What a curiosity must look like

A curiosity belongs to nobody. A player must see at a glance that it is not
a unit, city or improvement of any faction, and that it is worth a look.

1. **Faction-less.** No recipe sends a faction layer or an owner layer. No
   cloth, heraldry, flag, banner, armour, tool or building style of a
   faction. No people.
2. **Neutral colours.** The seven
   [faction colours](../FACTION_COLOURS.md) cover every saturated hue:
   crimson, violet, hazard yellow, red-orange, magenta, ice blue and signal
   green. A curiosity therefore uses neutrals only: dusty umber brown,
   taupe, charcoal, weathered pale grey stone, old grey-brown driftwood,
   bone white, and a little dull moss. Its one light note is white: white
   water, white light, white sparkles (the Fountain's water may be a pale
   turquoise-white). **Gold is allowed only on coins** (the salvage and
   bounty pieces), where it is the colour of the HUD coin, not of a player.
   The review measures every master against the seven faction colours
   (section 5).
3. **A little mysterious, still chibi.** Old, weathered, quiet: mossy
   stone, driftwood, silk and bones. The Spider is chunky and cute with big
   glossy eyes, as the spec asks; nothing is gory or realistic.
4. **Black outline, like the Treasure chest and the resources.** The tile
   overlays keep the thick black outline of the chibi pieces (they are
   rare and must be found), but are calmer and less saturated than a unit.
5. **Reads at zoom 0.75**, by its silhouette alone: eight legs and a round
   abdomen; a wide basin with a plume of water; an arch with an idol; a
   leaning mast over hull ribs; a wheel of silk strands.
6. **Nothing under it.** No plate, slab, grass or water is drawn in any
   piece. The Wreck shows only what is above the waterline.

## 2. Assets, canvases and anchors

Sizes are DPR 1 master pixels (CSS pixels at zoom 1, one 80 x 80 cell).

| Subject                                                | Class        |  Canvas | Placement                                             |
| ------------------------------------------------------ | ------------ | ------: | ----------------------------------------------------- |
| `UNIT:MONSTER_GIANT_SPIDER`                            | `GIANT_UNIT` | 88 x 72 | bottom-centred, anchor `(44, 32)`                     |
| `PORTRAIT:MONSTER_GIANT_SPIDER`                        | `PORTRAIT`   | 48 x 48 | interface                                             |
| `CURIOSITY:WEB`                                        | `BUILDING`   | 80 x 80 | the cell: anchor `(40, 40)`; under the Monster's home |
| `CURIOSITY:FOUNTAIN`                                   | `BUILDING`   | 80 x 80 | the cell; on Grass                                    |
| `CURIOSITY:SHRINE`                                     | `BUILDING`   | 80 x 80 | the cell; on Grass and Forest                         |
| `CURIOSITY:WRECK`                                      | `BUILDING`   | 80 x 80 | the cell; on Shallow and Deep Water                   |
| `ICON:CURIOSITY:{WEB,FOUNTAIN,SHRINE,WRECK}`           | `ICON`       | 48 x 48 | Help and legend                                       |
| `ICON:CURIOSITY:BOUNTY`                                | `ICON`       | 48 x 48 | the bounty in the unit panel and the event log        |
| `EFFECT:{FOUNTAIN_HEAL,SHRINE_BLESSING,SALVAGE_COINS}` | `EFFECT`     | 48 x 48 | effects canvas, centred on the unit                   |
| `STATUS:PROVOKED`                                      | `STATUS`     | 32 x 32 | a 16 CSS px board marker                              |

- **The Spider is a giant.** It is as wide as a Juggernaut-class giant
  (88 px canvas, the `GIANT_UNIT` width) and lower, because a spider is
  wide and flat: the canvas is 88 x 72 instead of 88 x 104, so the sprite
  fills it. It has no owner area and no mask (`fixedColours`).
- **A tile overlay is one cell.** It is a `BUILDING` asset of exactly
  80 x 80 with the class anchor, so its canvas is the cell and it never
  overflows. It has no owner colour.
- **The Fountain and the web stay under a unit.** A unit heals by standing
  on the Fountain, and the Monster rests on its web. Both must still read
  with a unit on the cell: the web runs to the cell's edges and the basin
  is wider than a standard unit. The review measures how much of each
  shows beside a Fighter and beside the Spider (section 5). The Shrine and
  the Wreck are claimed by the unit that enters and need not.
- **The spec's "legend icons cut from the overlays"** are separate 48 x 48
  sprites of the same subjects: an 80 px overlay cannot be cut to 48 px
  without scaling pixel art down, which the pipeline never does.

## 3. Recipe classes

The batch is `curiosities` (faction `ORIGINAL`, as for the other
faction-neutral batches; no class below sends the faction layer). Four
recipe classes were added to
[`batch-manifest.ts`](../../../scripts/art/chibi/batch-manifest.ts), each
with its own class text in
[`scripts/art/chibi/fragments/`](../../../scripts/art/chibi/fragments/):

| Recipe class         | Camera        | Makes                      | Derivation |
| -------------------- | ------------- | -------------------------- | ---------- |
| `curiosity-monster`  | three-quarter | the Spider (unit classes)  | as-is      |
| `curiosity-portrait` | portrait      | its portrait               | as-is      |
| `curiosity-site`     | three-quarter | the 80 x 80 tile overlays  | as-is      |
| `curiosity-item`     | icon          | icons, effects, the marker | as-is      |

Subject texts are in
[`SHARED.json`](../../../scripts/art/chibi/subjects/SHARED.json).

## 4. What the batch made

39 recipes, each one PixelLab call (38 completed; one edit job failed at
PixelLab and was retried under a new id). 15 assets accepted:

| Asset                                    | Accepted recipe                  | What it is                                                                                       |
| ---------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `chibi-curiosity-giant-spider`           | `spider-a`                       | chestnut-brown spider, 82 x 63 px, glossy black eyes, cream stripes, bone-white leg tips         |
| `chibi-curiosity-portrait-giant-spider`  | `spider-portrait-a-edit2`        | its face with fangs and front legs, recoloured from red-brown to the sprite's chestnut           |
| `chibi-curiosity-web`                    | `web-bones-edit`                 | bone-white ground web, 74 x 64 px, with a skull and a bone                                       |
| `chibi-curiosity-fountain`               | `fountain-c`                     | wide low stone basin, 68 px across, pale turquoise water, a short spout with a white plume, moss |
| `chibi-curiosity-shrine`                 | `shrine-a-edit`                  | mossy grey stone arch with a pale glowing idol, 40 x 43 px                                       |
| `chibi-curiosity-wreck`                  | `wreck-a-edit`                   | listing grey-brown hull with a broken mast and a torn cream sail, 45 x 49 px                     |
| `chibi-curiosity-icon-web`               | `icon-web-a-edit`                | bone-white web with a small skull                                                                |
| `chibi-curiosity-icon-fountain`          | `icon-fountain-a`                | small basin with a plume                                                                         |
| `chibi-curiosity-icon-shrine`            | `icon-shrine-a-edit`             | the arch and idol                                                                                |
| `chibi-curiosity-icon-wreck`             | `icon-wreck-a-edit`              | listing wreck with a torn sail, recoloured from maroon to driftwood                              |
| `chibi-curiosity-icon-bounty`            | `icon-bounty-a-edit`             | heap of gold coins with a bone-white fang on top                                                 |
| `chibi-curiosity-effect-fountain-heal`   | `effect-fountain-heal-a-edit`    | three white droplets with sparkles                                                               |
| `chibi-curiosity-effect-shrine-blessing` | `effect-shrine-blessing-a-edit`  | warm white star with sparkles over a pale pool of light                                          |
| `chibi-curiosity-effect-salvage-coins`   | `effect-salvage-coins-gold-edit` | two gold coins                                                                                   |
| `chibi-curiosity-status-provoked`        | `status-provoked-b`              | angry charcoal spider face with slanted white eyes between two bone-white fangs                  |

The registry lines are in
[`chibi-curiosities-art-manifest.ts`](../../../src/assets/chibi-curiosities-art-manifest.ts),
registered in the live direction registry since the UI bead
(`pulp_wars-737.6`). Every rejected recipe keeps its reason in
[`records/batch-curiosities.json`](../../../scripts/art/chibi/records/batch-curiosities.json).

What worked, added to the prompt notes of
[the pipeline document](../CHIBI_PIPELINE.md):

- **A spider needs no special view.** The default south-east unit view with
  "eight thick short bent hairy legs, four on each side, spread wide" gave a
  clean spider first time; the high top-down view filled the canvas edge to
  edge.
- **A web on the ground is a web seen from the front.** Asked for "from
  directly above", Pixen drew a stone-rimmed pit twice. The `side` view
  drew a flat web; one edit removed its hoop ("Change only one thing: erase
  the round grey-green hoop …") and a second added the skull and bone
  ("Add only two tiny details …").
- **Width must be asked for as edge contact.** "Much wider than it is tall"
  gave a 47 px fountain and "like a shallow paddling pool" 54 px; "its
  stone rim touches the left edge and the right edge of the image" gave
  68 px.
- **Sites and items come on plates.** The Shrine, the Wreck and four of the
  nine item creations stood on a grass, soil or water block. An edit that
  names what stays ("Erase everything except …") removed each one.
- **Coins come out orange, fur red-brown, silk pink.** A colour-only edit
  with hex values and "not orange", "not red and not maroon" fixed each;
  an edit that also had to remove a plate did not recolour.
- **What did not work:** cutting the Wreck's hull at a waterline by an edit
  (nothing changed), a fresh "almost completely under water" Wreck (a whole
  ship with a flag), and a web icon without a hub (a black disc).

## 5. Review and measurements

`npm run art:curiosities-review` writes
[`art/pixellab/reviews/chibi-batch-curiosities/`](../../../art/pixellab/reviews/chibi-batch-curiosities/):
`pieces-{x4,1x}.png` and `pieces-zoom-0.75.png` (every board piece on each
terrain it may stand on, the Spider on its web, a Fighter and a Juggernaut
on the Fountain and the web), `scale-{x2,1x}.png` (the Spider beside a
Fighter and the seven Juggernaut-class giants), `interface-{x4,1x}.png`
(portrait, icons, effects and the marker on the dock panel and a light
page, the effects over a Fighter, the marker at 16 px over the Spider),
`scene-{x2,1x}.png` and `scene-zoom-0.75.png` (a 7 x 5 board mock),
`readability.json` and `index.json`. The sheets are composed from the
masters. The board captures are those of
`npm run review:ruleset7-curiosities-ui` (section 7).
`--preview recipe[:candidate],… --out DIR` lays raw candidates out the same
way before acceptance, and `--copy-to DIR` copies the evidence.

Measured on the masters (`readability.json`; a test pins them):

- **Faction colours.** No pixel of the Spider, its portrait, the web, the
  Shrine or the Wreck is within CIE76 25 of a faction colour. The Fountain
  has 0.8% (its water, toward the Ice Folk blue), the fountain icon 4.8%.
  The two coin pieces are gold by design: 40% and 51% of their pixels are
  near the Goblin hazard yellow, none near any other faction.
- **Size.** The Spider is 82 x 63 px; the giants are 71 to 86 px wide and
  77 to 97 px tall, the Fighter 52 x 72 px. It is as wide as a giant and
  lower than a Fighter.
- **Ground contact** (`scripts/art/unit-shadows/measure.ts`, the live
  units' measurement): contact line 67 of 72, foot band 18 to 25 (one leg
  tip), base band 6 to 81. The numbers are
  `GIANT_SPIDER_SHADOW_MEASUREMENT_V7` in the manifest module and, since
  the UI bead registered the Spider, its entry in the live table
  (`unit-shadow-measurements-v7.generated.ts`). The shadow takes its width
  from the base band.
- **Under a unit.** 35% of the Fountain shows beside a Fighter (its rim on
  both sides) and 20% beside a Juggernaut; 40% of the web shows beside a
  Fighter and 32% beside the Spider.

## 6. Weak spots and notes for the UI bead

- **The Wreck is a whole listing hull,** not only what is above a
  waterline. It reads as a derelict beside a Patrol Boat (torn sail, no
  colour, tilted), but the UI bead may clip its lowest rows or draw the
  water's ripple marks over them.
- **The Fountain under a giant** shows only a fifth of itself. The heal
  sparkle at Start Turn is the cue there.
- **The Shrine on Forest** is drawn over the trees in the sheets. The UI
  bead decides the order (the Shrine over the Forest body reads; under it
  the arch would be hidden).
- **The web icon** reads a little like a ship's wheel at 24 px; the skull
  in its hub helps at 48 px.
- **The blessing star** kept a pale pool of light under it. The effects
  canvas may crop it or use it as the ground glow.
- **The provoked marker** has a few dark magenta outline pixels on its
  fangs (none within the faction threshold).
- **Effects are kept as generated** (`as-is`), not palette-mapped like the
  Undead, Martian, Ice Folk and Dwarf effects: they need gold and white,
  which those classes' texts exclude.

## 7. How the game draws it (`pulp_wars-737.6`)

- **Live look only.** The fifteen assets are in the live direction
  registry (`chibiDirectionArtRegistryV7`). The Classic look and the LEGACY
  art set have no curiosity raster and draw code markers
  ([`curiosity-canvas-v7.ts`](../../../src/render/canvas/curiosity-canvas-v7.ts),
  [`curiosity-dom-v7.ts`](../../../src/render/dom/curiosity-dom-v7.ts)).
- **As authored.** The overlays, the marker and the effects take no owner
  colour and no tone of the visual direction.
- **Draw order.** The web under everything on its cell; the Fountain, the
  Shrine and the Wreck over the Forest body of their own cell and under
  the unit on the tile (the Shrine on Forest reads over the trees).
- **The Wreck is cut at a waterline:** only master rows 0 to 57 are drawn
  and two pale ripple marks cover the cut, so the hull sits in the water
  (the weak spot of section 6). The Gallery shows the whole master.
- **The Spider's shadow** is the giant shadow under its spread legs (33 px
  half-width at master scale, from the base band).
- **The provoked marker** is drawn at 16 master px in the top-right corner
  of the Spider's cell, and of every Move target that ends next to it.
- **The effects** are drawn at 1:1 over the unit, with a code-drawn ring
  and a rising number; the blessing star keeps its pale pool of light.
- **The portrait** is the Spider's dock and dialog figure; the five icons
  are the Help and tile-dock legend.
- **Captures.** `npm run review:ruleset7-curiosities-ui -- <dev server URL>`
  (the curiosities UI fixture; desktop and phone; the live look, the
  Classic look and LEGACY; zoom 1 and 0.75).

## 8. Round 2 (`pulp_wars-737.13`)

[The spec, section 34.2](../../product/RULESET_7_MAP_CURIOSITIES.md#342-art-pixellab-chibi-direction)
asks for the art of the round-2 curiosities under this contract: the
Downed Saucer and the Graveyard (camp centres), one look for both
Dimensional Gates, the Wishing Well, the neutral Bigfoot, their icons and
two effects. Sections 1 to 3 apply unchanged: no faction or owner layer,
neutral colours (gold only on a coin), black outline, nothing under a
tile overlay, the same four recipe classes, canvases and anchors.

### 8.1 Assets

Batch `curiosities-2` (faction `ORIGINAL`, never sent; `fixedFactionColours`).
Subject texts in
[`SHARED.json`](../../../scripts/art/chibi/subjects/SHARED.json); the
manifest's subject pattern and the type `CuriosityRound2ArtSubjectV7` in
[`chibi-art-v7.ts`](../../../src/assets/chibi-art-v7.ts) accept them.

| Subject                        | Class        |  Canvas | Accepted recipe               | What it is                                                                                          |
| ------------------------------ | ------------ | ------: | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `UNIT:NEUTRAL_BIGFOOT`         | `GIANT_UNIT` | 88 x 96 | `bigfoot-a`                   | shaggy umber Bigfoot, 63 x 82 px, hunched, one hand raised shyly to its chest, huge bare feet       |
| `PORTRAIT:NEUTRAL_BIGFOOT`     | `PORTRAIT`   | 48 x 48 | `bigfoot-portrait-a`          | its head and shoulders, a hand raised shyly to its face                                             |
| `CURIOSITY:DOWNED_SAUCER`      | `BUILDING`   | 80 x 80 | `saucer-b-edit`               | dull grey riveted saucer tilted steeply, pale glass dome, bent antenna, scorched breach, 52 x 51 px |
| `CURIOSITY:GRAVEYARD`          | `BUILDING`   | 80 x 80 | `graveyard-a-edit2`           | three crooked mossy grey headstones and broken black iron fence bars, 64 x 52 px                    |
| `CURIOSITY:GATE`               | `BUILDING`   | 80 x 80 | `gate-b`                      | a ring of tall mossy standing stones round a white whirlpool of light, 73 x 65 px                   |
| `CURIOSITY:WISHING_WELL`       | `BUILDING`   | 80 x 80 | `well-a`                      | round grey stone well, shingled roof on two posts, crank, rope, bucket and a coin glint, 45 x 57    |
| `ICON:CURIOSITY:DOWNED_SAUCER` | `ICON`       | 48 x 48 | `icon-saucer-a`               | small tilted grey saucer                                                                            |
| `ICON:CURIOSITY:GRAVEYARD`     | `ICON`       | 48 x 48 | `icon-graveyard-b-edit`       | two leaning headstones behind an iron fence                                                         |
| `ICON:CURIOSITY:GATE`          | `ICON`       | 48 x 48 | `icon-gate-d-edit`            | a ring of small standing stones round a pale white whirlpool                                        |
| `ICON:CURIOSITY:BIGFOOT`       | `ICON`       | 48 x 48 | `icon-bigfoot-a`              | one big umber five-toed footprint (the LEGACY glyph's subject)                                      |
| `ICON:CURIOSITY:WISHING_WELL`  | `ICON`       | 48 x 48 | `icon-well-a-edit`            | the well with its roof and bucket                                                                   |
| `EFFECT:GATE_TRAVERSE`         | `EFFECT`     | 48 x 48 | `effect-gate-traverse-a-edit` | a white spiral burst with short rays and sparkles                                                   |
| `EFFECT:COIN_SPLASH`           | `EFFECT`     | 48 x 48 | `effect-coin-splash-a-edit`   | one gold coin dropping into a white splash with droplets                                            |

Bigfoot has the giant bounds the spec asks for (88 x 96, under the 88 x 104
limit; the hunched pose is lower than a Juggernaut). The registry lines are
`CHIBI_CURIOSITIES_ROUND2_ART_ASSETS_V7` in
[`chibi-curiosities-art-manifest.ts`](../../../src/assets/chibi-curiosities-art-manifest.ts),
with `BIGFOOT_SHADOW_MEASUREMENT_V7` (contact line 89 of 96, foot band 21
to 66, base band 21 to 69). **Registered, not drawn:** like the faction
Monuments, they are in the live direction registry (so the preload fetches
them), but no rule or drawing asks for their subjects until the round-2 UI
bead (`pulp_wars-737.16`), which also adds Bigfoot to the unit-shadow
table, as `pulp_wars-737.6` did for the Spider.

31 recipes, 31 PixelLab calls (21 creations, 10 edits), $0.28 in all (0.7
to 1.6 cents a call, `usageUsd` in
[`records/batch-curiosities-2.json`](../../../scripts/art/chibi/records/batch-curiosities-2.json),
which keeps every rejected recipe's reason).

### 8.2 The camp guards

The guards have no sprite of their own (spec section 34.2): the Martian
Grunt, Ray Gunner and Shield Projector and the Undead Zombie are drawn as
authored, with no owner colour, like the Spider. `guards-{x2,1x}.png`
shows each on Grass, Forest, Mountain and the dark panel, beside the Spider
and Bigfoot. **Ruling: acceptable.** The Martian bodies are grey suits
with a lilac face and small magenta lights (1.2 to 6.5% of their pixels
near the Martian magenta, under 0.5% near the Candy pink, nothing near any
other faction); the Zombie has 4.8% near the Undead violet. A Downed
Saucer is never placed with a Martian seat and a Graveyard never with an
Undead one, so the faction colour on a guard never names a player in the
match, and the live look shows owners by the faction's look and the
territory border, not by a garment. They read as "stranded Martians" and
"Zombies" at once, which the curiosity wants. No guard sprite was made or
changed.

### 8.3 What worked and what did not

- **Sites still come on plates.** The first Saucer, Graveyard, Well icon,
  Gate icon, Graveyard icon and both effects stood on a grass, soil or
  pedestal block, despite the class text. "Erase everything except …" or
  "Remove only the ground …" removed each.
- **An edit may drop what it should keep.** The first Graveyard edit
  erased the iron fence with the soil; naming the fence bars and saying
  "keep every bar standing exactly where it is" kept them (scattered, which
  reads as a broken fence).
- **"A dent" became a face.** The first Saucer's dark dent with a rim read
  as an eye; "only long black scorch streaks, never a hole, it has no face"
  gave a crash breach instead.
- **A gate must say "tall upright pillars".** "A ring of standing stones
  around a swirl" gave a low basin ring that read as a second Fountain with
  a blue swirl; "like a tiny Stonehenge: each stone a tall upright pillar
  twice as tall as it is wide … touch the left and right edge … never blue"
  gave a 73 px ring.
- **A gate icon is hard at 48 px.** A red peppermint swirl (30% near the
  Human crimson), a white crystal cluster, a cyan swirl whose stones lost
  their outline, and a recolour that erased the swirl were rejected; the
  Stonehenge text plus a plate edit gave the accepted ring.
- **Bigfoot needs no special view.** The default unit view gave a clean
  shaggy cryptid first time; a "chibi proportions, not a gorilla" variant
  drifted to ginger fur and a grumpy face.

### 8.4 Measurements (`readability.json`)

- **Faction colours:** no round-2 master has more than 1.3% of its pixels
  within CIE76 25 of a faction colour (the saucer icon's moss dots, toward
  the Dwarf green); the Well's coin glint is 0.4% near the Human crimson.
  The coin splash's gold is not within the threshold of the Goblin yellow.
- **Size:** Bigfoot 63 x 82 px against the Fighter's 53 x 72.
- **Under a unit:** 41% of the gate shows beside a Fighter (22% beside a
  Juggernaut), 34% of the Graveyard, 19% of the Saucer, 17% of the Well.
  The round-1 numbers of section 5 were re-measured against today's
  Fighter and giants (`readability.json`): the Fountain 35%, the web 42%
  beside a Fighter; the tests' bounds still hold.

### 8.5 Weak spots and notes for the UI bead

- **The Well under a unit** shows only its roof edge and bucket (17%); a
  unit stands on it to toss, so the dock's Toss a Coin command and the
  tile chip are the cue there.
- **The Saucer** is smaller than a camp guard (52 px) and tilted, not half
  buried; the guards round it make the camp.
- **The Graveyard's fence** lies in two loose pieces to the left of the
  headstones; the composition sits in the cell's upper middle.
- **The gate** has one brown stone among the grey, and a stone floor in
  its ring (part of the portal, not a terrain plate).
- **The gate icon's whirlpool** has no black outline and reads at 24 px as
  a pale disc in a ring of dots.
- **The gate-traverse burst** is white: on the light page it nearly
  vanishes; it is a board effect.
- **Bigfoot** is drawn in fine fur strands, a little more detailed than the
  Spider; it reads at zoom 0.75 by its silhouette.

### 8.6 Review

`npm run art:curiosities-review` now reads both batches and also writes
`pieces2-{x4,1x}.png` and `pieces2-zoom-0.75.png` (Bigfoot on Forest, Grass
and Mountain; each overlay on its terrain, with a Fighter, a Juggernaut on
the gate, and the Saucer's Grunt and the Graveyard's Zombie),
`interface2-{x4,1x}.png` (the portrait, icons and effects on the dock and
a light page, the traverse burst over a Fighter, the splash over the Well),
`guards-{x2,1x}.png`, `scene2-{x2,1x}.png` and `scene2-zoom-0.75.png` (a
board mock with a saucer camp, a Graveyard with two Zombies, a gate,
Bigfoot in its Forest and the Well), `contact-sheet-{x2,1x}.png` (every
master of both rounds), Bigfoot in the scale sheet, and the round-2
masters, guards, Bigfoot and overlays in `readability.json`. `--preview`
finds a recipe in either batch.
