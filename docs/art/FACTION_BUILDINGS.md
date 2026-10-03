# Faction building looks: proposal and sample study

**Status:** proposal for bead `pulp_wars-xdh.1` (epic `pulp_wars-xdh`),
waiting for the user's review. **Nothing here is wired into the game.** The
PixelLab sample is prepared but **not generated yet**: the worker shell had
no `PIXELLAB_API_KEY` (see [Sample study](#sample-study)). The Undead grass
candidates need no PixelLab call and are in the board study already.

The user's request (2026-10-03): some, not all, building sprites and
descriptions become faction specific. When the Undead take a city, the
buildings inside its borders change appearance (a Farm becomes a
graveyard; "the undead don't need farms"); the grass there becomes
"slightly more halloweeny, but don't go overboard"; Goblins can keep the
Farm; Martians should have something other than windmills, solar panels
maybe. It is **purely visual**: no rule, number or tooltip value changes.

## 1. Rules of the proposal

1. **Who decides the look: the territory owner.** A building is drawn in
   the look of the faction that owns the city whose territory it is in
   (`tile.territoryOwnerId`), the rule the faction cities already follow
   (`cityArtSubjectV7`: "a captured city changes its look with its owner").
   A captured city's buildings flip with it.
2. **Most cells stay the same.** Every faction keeps the shared calm
   building set except for its one or two most jarring mismatches: a
   building whose idea contradicts the faction (the Undead do not eat; a
   medieval windmill in a stone-age camp; open vegetable beds in Ice Folk
   snow).
3. **Same footprint, same role.** A replacement keeps the improvement's
   canvas, anchor and placement: a Farm replacement is a seamless
   `crop-rows` field (blocks of Farms still read as one field, Roads show in
   the gaps), a Windmill replacement a seated `calm-building` of at most
   72 x 72. It reads as "this faction's version of X", not as a new
   building.
4. **Names change, rules do not.** The faction name replaces the building's
   name where the building itself is named (the board label, the tile dock
   title, the build button of that faction's viewer). Every rules text keeps
   its numbers; where a rule names the generic building ("+1 per adjacent
   farm"), it stays, and the dock shows a one-line flavour description that
   ends "Counts as a Farm." so the vocabulary stays learnable. Technology
   names (Farming, Milling) do not change.
5. **Calm, faction-coloured, no player colour.** Replacements follow the
   [visual direction](VISUAL_DIRECTION_2026-10.md) for buildings (flat,
   muted, recede behind units) in the faction's fixed materials (its
   [faction fragment](factions/README.md)); no owner mask.

## 2. Inventory

Every improvement of `IMPROVEMENT_IDS_V7`, plus what else stands in a
territory. All are drawn today from one shared, neutral calm set
([`chibi-direction-art-manifest.ts`](../../src/assets/chibi-direction-art-manifest.ts),
batch `direction-human`).

| Building    | Today's look                                                                                                     | Canvas  | Where its name and text appear                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| Farm        | three raised beds of mixed vegetables, a seamless field (`crop-rows`)                                            | 80 x 80 | board label, tile dock title, build button "Farm", Windmill formula ("adjacent farm")    |
| Lumber Camp | pines, a log stack, an axe in a stump                                                                            | 72 x 72 | label, dock, "Lumber camp" button, Sawmill formula                                       |
| Mine        | part of the Mined Mountain terrain art (grey rock, pale timber)                                                  | terrain | label, dock, "Mine" button, Forge formula                                                |
| Windmill    | cream plaster tower, terracotta cone roof, four oak sails                                                        | 64 x 72 | label, dock, button, formula "Windmill: +1 per adjacent farm; heals …", healing log line |
| Sawmill     | big steel circular saw blade on a bench, shed, logs                                                              | 72 x 72 | label, dock, button, formula                                                             |
| Forge       | stone smithy, chimney, fire glow, anvil                                                                          | 72 x 72 | label, dock, button, formula                                                             |
| Workshop    | timber-framed house with a cogwheel on the gable                                                                 | 72 x 72 | label, dock, button, formula "Workshop: grows with varied neighbors"                     |
| Market      | two striped stalls heaped with goods                                                                             | 72 x 72 | label, dock, button, formula                                                             |
| Monument    | pale stone obelisk with a gold star                                                                              | 48 x 72 | label, dock, "Monument" button, achievement text                                         |
| Port        | oak pier, harbour hut, mast                                                                                      | 72 x 72 | label, dock, button, naval texts                                                         |
| Shipyard    | half-built hull, crane, boathouse                                                                                | 72 x 72 | label, dock, button, naval texts                                                         |
| Grass       | `chibi-grass-1..3`, one muted green (`#8ab85c`) with a few tufts                                                 | 80 x 80 | terrain name only                                                                        |
| _Not owned_ | City 1–3 (already per faction), the Village (neutral site), Roads, the code-drawn Field Defense and Grave marker |         | unchanged by this proposal                                                               |

The code reads names in `title(tile.improvement)` (the board label in
`board-renderer-v7.ts` and the tile dock title in `app-view-v7.ts`),
`COMMAND_LABELS`, `economicFormulaV7` and the Windmill healing texts of
`app-view-v7.ts`; the dock and technology card art come from
`improvementSubjectV7` (`chibi-ui-art-v7.ts`).

## 3. Per-faction table

"same" means the shared building as today. **Bold** changes are in this
bead's sample.

| Building    | Human | Undead                     | Goblin | Dinosaur           | Martian         | Ice Folk        | Dwarf             |
| ----------- | ----- | -------------------------- | ------ | ------------------ | --------------- | --------------- | ----------------- |
| Farm        | same  | **Graveyard**              | same   | same               | Hydroponic Farm | Frost Garden    | **Mushroom Farm** |
| Windmill    | same  | Bone Mill                  | same   | **Grinding Stone** | **Solar Array** | same            | Steam Pump        |
| Sawmill     | same  | same                       | same   | Chopping Block     | same            | same            | same              |
| Lumber Camp | same  | same                       | same   | same               | same            | same            | same              |
| Mine        | same  | same                       | same   | same               | same            | same            | same              |
| Forge       | same  | same                       | same   | same               | same            | same            | same              |
| Workshop    | same  | same                       | same   | same               | same            | same            | same              |
| Market      | same  | same                       | same   | same               | same            | same            | same              |
| Monument    | same  | same                       | same   | same               | same            | same            | same              |
| Port        | same  | same                       | same   | same               | same            | same            | same              |
| Shipyard    | same  | same                       | same   | same               | same            | same            | same              |
| Grass       | same  | **gloam** (cooler, duller) | same   | same               | same            | same (has Snow) | same              |

### The changes

| Faction  | Building → name               | Look (one line)                                                                                   | Flavour description (rules text unchanged)                        | Why                                                         |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Undead   | Farm → **Graveyard**          | three rows of low dark burial mounds with small dark wooden crosses and a few pale violet flowers | "Quiet plots, tended for later. Counts as a Farm."                | the user's example; the Undead do not eat                   |
| Undead   | Windmill → Bone Mill          | the same windmill in dark slate with ragged charcoal sails and one violet window                  | "Grinds old bones into something useful. Counts as a Windmill."   | a grain mill beside a graveyard; cheap (an edit of today's) |
| Martian  | Windmill → **Solar Array**    | three tilted navy solar panels on chrome stands, a mast with one small magenta light              | "Drinks the light of a lesser star. Counts as a Windmill."        | the user's example; sails are the opposite of a saucer      |
| Martian  | Farm → Hydroponic Farm        | the vegetable beds in chrome troughs under small glass domes                                      | "Earth vegetables, under glass. Counts as a Farm."                | second priority; the plants keep the Farm readable          |
| Dinosaur | Windmill → **Grinding Stone** | a huge round millstone on basalt stones, a wooden lever, a hide lean-to on bone poles             | "Push the pole, crush the grain. Counts as a Windmill."           | the worst anachronism: machinery in a stone-age camp        |
| Dinosaur | Sawmill → Chopping Block      | a big stone axe in a split stump beside split logs, no steel saw                                  | "A big stone axe and a bigger arm. Counts as a Sawmill."          | a steel circular saw in a stone-age camp                    |
| Ice Folk | Farm → Frost Garden           | rows of hardy blue-green frost cabbages in snow-banked beds                                       | "Cabbages that like the cold. Counts as a Farm."                  | green open beds look wrong under the Ice Folk Snow          |
| Dwarf    | Farm → **Mushroom Farm**      | three rows of big tan and russet mushrooms on dark peat beds                                      | "Grown in the dark, eaten with ale. Counts as a Farm."            | the classic dwarf crop; still plainly a farm                |
| Dwarf    | Windmill → Steam Pump         | a squat copper boiler tower with a chimney puffing steam and a turning cog wheel                  | "Hisses, clanks and keeps the pressure up. Counts as a Windmill." | steampunk; second priority                                  |

**Kept the same, on purpose.** The Goblins keep everything (the user: they
can have the same farms; scrap-built versions would add clutter for little
gain). The Lumber Camp, Mine, Forge, Workshop, Market, Monument, Port and
Shipyard read as generic enough for every faction; changing them all would
make the board harder to learn, against "some but not all". The Ice Folk
Windmill stays: a windmill in a snowy land is plausible.

**Rejected ideas.** A Martian "crop circle" Farm (reads as a decal, not a
Farm, and hides Roads); Ice Folk ice-fishing holes as the Farm (fish read as
the Fish resource and the Port); a Dinosaur fern grove or nest as the Farm
(nests read as the Egg); a Goblin scrap Windmill (the user wants Goblin
farms kept, and the Goblin cities already carry the scrap look); a
graveyard of pale round-topped headstones (that is the shape of the
code-drawn **Grave** marker, a gameplay marker the Necromancer raises from;
the Graveyard uses dark crosses and mounds so the two never mix).

## 4. The Undead territory grass

Inside Undead territory the Grass (and the grass under Forest trees and
beside Mountains) is drawn in a cooler, duller, slightly darker green with
violet-grey tufts. Nothing is added: no skulls, bones or graves on the
ground. Outside it, Grass is unchanged; the territory border sits on the
colour step.

Four candidates were made **in code**, with no PixelLab call
([`undead-grass.ts`](../../scripts/art/faction-buildings/undead-grass.ts)):
each Grass master has only four colours (`#8ab85c` and three tufts), so a
candidate is an exact colour swap of the reviewed tiles. That keeps the
texture, the seamless joins and the three variants, and a territory edge is
a colour change only.

| Candidate            | Base      | Tufts                         | Verdict on the board                                                        |
| -------------------- | --------- | ----------------------------- | --------------------------------------------------------------------------- |
| cool                 | `#7dab76` | `#93be8a` `#659162` `#50764f` | reads as a paler green, not as dusk                                         |
| dusk                 | `#7dab76` | dark tufts toward violet-grey | the tufts are flattened by the terrain tone; same as cool                   |
| **gloam** (proposed) | `#749b76` | `#86ab86` `#54605e` `#4c5656` | the only one that reads as evening; still clearly grass; not spooky "props" |
| wilt                 | `#a1a678` | dry olive                     | autumnal, but reads as dry land or a different biome; rejected              |

A PixelLab alternative is prepared (recipes `undead-grass-a` and
`undead-grass-b`, Pixflux forced to
[`undead-grass.png`](../../scripts/art/chibi/palettes/undead-grass.png) and
`undead-grass-leaves.png` with the gloam colours; the second adds a few
dusky purple fallen leaves). The recolour is the recommendation either way:
a new Pixflux field has a different tuft pattern, so it would be a second
texture beside today's, where the recolour is the same field at dusk.

Wiring notes for production:

- **Terrain tone.** The live look tones all Grass toward one fixed pivot
  (`GRASS_PIVOT`, contrast 65%), which pulls the Undead grass a third of the
  way back to green. The candidates were judged after that tone (in the
  board captures), so registering them as Grass variants gives what the
  captures show. Toning them around their own mean would make the shift
  stronger.
- **Forest.** The Forest master carries its ground; the study re-composites
  the two Forest bodies over the Undead grass (`groundComposite`, as the
  pipeline builds them). The tree canopies stay bright yellow-green, which
  is the strongest remaining mismatch; a calm recolour of the Forest body
  in Undead territory is a possible follow-up, not proposed here.
- **Mountains** draw Grass under their fringe, which follows automatically.

## 5. Sample study

### What is prepared

Exploration run
[`art/explorations/faction-buildings-2026-10/`](../../art/explorations/faction-buildings-2026-10/)
(`batch.json`, `subjects.json`, `faction.md`, run fragments), validated by
`npm run art:chibi -- prompts --exploration art/explorations/faction-buildings-2026-10`.
The classes skip the faction layer, so each subject line names its
materials; the run overrides `class-calm-building` (no Human materials
named) and `class-crop-rows` / `camera-crop-pattern` (no "plants" or
"vegetable garden", so a graveyard is not drawn as cabbages).

| Asset                           | Class           | Recipes (seed)                           | Approach                                                                        |
| ------------------------------- | --------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| `chibi-undead-graveyard`        | `crop-rows`     | `graveyard-flux-a` (97101), `-b` (97102) | Pixflux high top-down like the accepted `veg-flux-a` Farm; then tune `cropRows` |
| `chibi-dwarf-mushroom-farm`     | `crop-rows`     | `mushroom-flux-a` (97201), `-b` (97202)  | as above                                                                        |
| `chibi-martian-solar-array`     | `calm-building` | `solar-a` (97301), `-b` (97302)          | Pixen creation; a ground-removal edit if it stands on a slab                    |
| `chibi-dinosaur-grinding-stone` | `calm-building` | `grindstone-a` (97401), `-b` (97402)     | as above                                                                        |
| `chibi-undead-grass-1`          | `terrain`       | `undead-grass-a` (97501)                 | Pixflux 160 x 160, forced gloam palette, seamless crop                          |
| `chibi-undead-grass-leaves-1`   | `terrain`       | `undead-grass-b` (97502)                 | as above, with a few dusky purple leaves                                        |

The two `crop-rows` assets carry a provisional `cropRows` (three rows, the
whole first bed stamped across the period); it must be set from the
accepted candidate's beds before `accept`, as for the Farm. Ten calls in
all, plus about two ground-removal edits and any retries.

To generate (needs `PIXELLAB_API_KEY` in the environment):

```sh
npm run art:chibi -- generate --exploration art/explorations/faction-buildings-2026-10 \
  --ids graveyard-flux-a,graveyard-flux-b,solar-a,solar-b,mushroom-flux-a,mushroom-flux-b,grindstone-a,grindstone-b
npm run art:chibi -- accept --exploration art/explorations/faction-buildings-2026-10 \
  --id <recipe> --candidate 0 --notes "..." --native-pass --enlarged-pass --owners-pass --no-plate-pass --camera-pass
npm run art:faction-buildings-review
```

### Board study

`npm run art:faction-buildings-review` writes
[`art/pixellab/reviews/faction-buildings-study/`](../../art/pixellab/reviews/faction-buildings-study/)
(the list is in the script's header): `buildings-{x3,1x}.png` (today's
building beside the sample, Farms also as 3 x 3 blocks, and the faction's
City 2; a sample not yet accepted is a "PixelLab pending" plate),
`grass-x2.png`, the scenes
`scene-{undead,martian}-{before,after}-{desktop,phone}-zoom-{1,0.75}.png`
(Dwarf and Dinosaur join once they have a sample),
`scene-undead-after-grass-<candidate>-desktop-zoom-1.png` and
`before-after-contact.png`.

The scenes ([`scene.ts`](../../scripts/art/faction-buildings/scene.ts)) are
drawn by the real board host in the live look: an 8 x 6 patch with the
studied faction's city territory on the left and a Human territory with the
same buildings in the same places on the right. The "after" frame applies
the proposal **per cell** without touching the game's code: on the 16 x 16
Showcase board `31x + 17y` differs for every cell, so a registry with 721
variants of a subject picks one entry per cell (`chibiVariantV7`), and the
studied territory's cells get the proposed raster. That is what a
per-territory lookup would draw.

![Undead and Martian territories beside Human ones, today and proposed](../../art/pixellab/reviews/faction-buildings-study/before-after-contact.png)

## 6. Weak spots and open questions

- **No PixelLab sample yet.** The building rows of the sheets and the
  Martian "after" scene show today's art until the recipes are generated
  and accepted.
- **The Graveyard must not look like a Grave.** The gameplay Grave marker
  is a pale round-topped headstone; the recipes exclude that shape. Check
  it at zoom 0.75 beside a Grave once generated.
- **Names in rules text.** "Windmill: +1 per adjacent farm" stays generic.
  Should a Martian viewer read "Solar Array: +1 per adjacent farm" or keep
  "Windmill"? The proposal keeps the generic word in rules and shows the
  faction name as the title (question for the user).
- **Forest canopy** stays bright in Undead territory (above).
- **Ice Folk** already have Snow over their territory, drawn under
  buildings; a Frost Garden must read on Snow and on bare Grass.

## 7. Production breakdown (proposed beads)

1. **Samples and the user's pick** (this bead, once the key is available):
   generate the ten recipes, accept, rerun the review.
2. **Runtime: faction building resolution** (`ui/presentation`): an
   improvement subject per faction (`IMPROVEMENT:<FACTION>:<ID>`, falling
   back to `IMPROVEMENT:<ID>`), resolved from the territory owner's faction
   in the board renderer, the tile dock and the technology card of that
   faction's viewer; Undead grass variants resolved the same way for
   Grass, the Forest ground and the Mountain fringe; tests that a captured
   city's buildings flip and that every other faction is unchanged.
3. **Runtime: names and flavour text** (`ui/presentation`): the display
   name in the board label, dock title and build button, the flavour line
   in the dock; rules texts unchanged; tests.
4. **Production art, one batch per faction** (`asset-only`): import the
   accepted samples, then the "later" pieces (Undead Bone Mill, Martian
   Hydroponic Farm, Dinosaur Chopping Block, Ice Folk Frost Garden, Dwarf
   Steam Pump), each reviewed with this board study.

2 and 3 can be one bead if small; 4 can start with the sampled pieces while
2 is built, since the review scene does not need the runtime.
