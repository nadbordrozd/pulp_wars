# Faction building looks

**Status: in the game** (bead `pulp_wars-xdh.2`, epic `pulp_wars-xdh`). The
nine buildings are production batches (`buildings-undead`, `-martian`,
`-dinosaur`, `-ice-folk`, `-dwarf`), the Undead "gloam" ground is baked as
masters, and the board, the tile dock, the build buttons, the technology
cards and the Gallery draw and name them by the territory owner: see
[In the game](#8-in-the-game). Sections 1 to 7 are the proposal and sample
study of bead `pulp_wars-xdh.1` as the root accepted them (2026-10-04);
where production changed something (the Bone Mill), section 8 says so.

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

"same" means the shared building as today. Every change has an accepted
sample; **bold** marks the first four that were made.

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

| Faction  | Building → name               | Look (one line)                                                                                  | Flavour description (rules text unchanged)                        | Why                                                         |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Undead   | Farm → **Graveyard**          | three rows of dark slate gravestones with moss, on mounds of dark earth with tiny violet flowers | "Quiet plots, tended for later. Counts as a Farm."                | the user's example; the Undead do not eat                   |
| Undead   | Windmill → Bone Mill          | the same windmill in dark slate with ragged charcoal sails, charcoal roofs and violet windows    | "Grinds old bones into something useful. Counts as a Windmill."   | a grain mill beside a graveyard; cheap (an edit of today's) |
| Martian  | Windmill → **Solar Array**    | three tilted navy solar panels on chrome stands, a mast with one small magenta light             | "Drinks the light of a lesser star. Counts as a Windmill."        | the user's example; sails are the opposite of a saucer      |
| Martian  | Farm → Hydroponic Farm        | the vegetable beds in chrome troughs under small glass domes                                     | "Earth vegetables, under glass. Counts as a Farm."                | second priority; the plants keep the Farm readable          |
| Dinosaur | Windmill → **Grinding Stone** | an upright grindstone with a wooden lever on a big flat millstone, a hide lean-to on bone poles  | "Push the pole, crush the grain. Counts as a Windmill."           | the worst anachronism: machinery in a stone-age camp        |
| Dinosaur | Sawmill → Chopping Block      | a huge axe in a tree stump, a pile of split logs and a hide lean-to, no saw blade                | "A big stone axe and a bigger arm. Counts as a Sawmill."          | a steel circular saw in a stone-age camp                    |
| Ice Folk | Farm → Frost Garden           | three rows of blue-green frost cabbages on thin banks of snow                                    | "Cabbages that like the cold. Counts as a Farm."                  | green open beds look wrong under the Ice Folk Snow          |
| Dwarf    | Farm → **Mushroom Farm**      | four rows of tan and brown mushrooms on thin peat beds                                           | "Grown in the dark, eaten with ale. Counts as a Farm."            | the classic dwarf crop; still plainly a farm                |
| Dwarf    | Windmill → Steam Pump         | a copper boiler with a domed top, an iron chimney puffing steam and a brass cog wheel            | "Hisses, clanks and keeps the pressure up. Counts as a Windmill." | steampunk; second priority                                  |

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
the Graveyard's stones are dark slate with moss, so the two differ by tone).

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

A PixelLab alternative was tried (recipes `undead-grass-a` and
`undead-grass-b`, Pixflux forced to
[`undead-grass.png`](../../scripts/art/chibi/palettes/undead-grass.png) and
`undead-grass-leaves.png` with the gloam colours) and rejected: the first
drew tree canopies into the meadow, the second a clean dusk meadow with far
fewer tufts than today's Grass, which would be a second texture beside it.
The recolour is the same field at dusk and is the accepted grass.

Wiring notes for production:

- **Terrain tone.** The live look tones all Grass toward one fixed pivot
  (`GRASS_PIVOT`, contrast 65%), which pulls the Undead grass a third of the
  way back to green. The candidates were judged after that tone (in the
  board captures), so registering them as Grass variants gives what the
  captures show. Toning them around their own mean would make the shift
  stronger.
- **Forest.** The Forest master carries its ground; the study re-composites
  the two Forest bodies over the Undead grass (`groundComposite`, as the
  pipeline builds them). The tree canopies keep their colours. In the board
  captures they read as trees on dusk grass and do not clash, so no canopy
  tone was made; it stays a possible follow-up if play shows otherwise.
- **Mountains** draw Grass under their fringe, which follows automatically.

## 5. Sample study

### What was made

Exploration run
[`art/explorations/faction-buildings-2026-10/`](../../art/explorations/faction-buildings-2026-10/)
(`batch.json`, `subjects.json`, `faction.md`, run fragments, records, raw
sheets, receipts, and the accepted masters under `assets/buildings/`). The
classes skip the faction layer, so each subject line names its materials;
the run overrides `class-calm-building` (no Human materials named) and
`class-crop-rows` / `camera-crop-pattern` (no "plants" or "vegetable
garden"). 25 PixelLab calls: 18 creations and 7 edits.

| Asset                           | Accepted recipe        | Recipes tried | How                                                                                                  |
| ------------------------------- | ---------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `chibi-undead-graveyard`        | `graveyard-pixen-a`    | 4             | Pixen creation; its top row of five stones stamped on three rows in a brick pattern                  |
| `chibi-undead-bone-mill`        | `bone-mill-edit-b`     | 2             | two edits of the accepted shared Windmill (`windmill-flat-a`): colours and sails, then the roofs     |
| `chibi-martian-solar-array`     | `solar-b-edit-c`       | 4             | Pixen creation, then a ground-removal edit                                                           |
| `chibi-martian-hydroponic-farm` | `hydroponic-edit-a`    | 2             | an edit of the accepted Farm candidate (`veg-flux-a`); its top trough stamped as five domes per tile |
| `chibi-dinosaur-grinding-stone` | `grindstone-a`         | 2             | Pixen creation, as drawn                                                                             |
| `chibi-dinosaur-chopping-block` | `chopping-block-b`     | 2             | Pixen creation, as drawn                                                                             |
| `chibi-ice-folk-frost-garden`   | `frost-garden-edit-a`  | 2             | an edit of `veg-flux-a`; its top row stamped as five cabbages per tile, brick pattern                |
| `chibi-dwarf-mushroom-farm`     | `mushroom-flux-b-edit` | 3             | Pixflux creation, then a colour edit; its tan and brown beds stamped on four rows                    |
| `chibi-dwarf-steam-pump`        | `steam-pump-b`         | 2             | Pixen creation, as drawn                                                                             |
| Undead grass (PixelLab)         | none                   | 2             | rejected, see section 4; the code recolour "gloam" is the grass                                      |

Rejected, with the reason recorded in `records.json`:

- `graveyard-flux-a`, `graveyard-flux-b`: Pixflux ignored the subject (pink
  slabs on grass; stumps and bushes on beds). `graveyard-pixen-b`: the
  runner-up, pointed grey-brown stones, thinner and paler.
- `mushroom-flux-a`: blue, red and yellow mushrooms and a row of trees.
  `mushroom-flux-b`: the right shapes with red and green caps (recoloured by
  the accepted edit).
- `solar-a`: small, the lamp low. `solar-b`: the chosen design on a slab.
  `solar-b-edit`: the slab became a glass plate.
- `grindstone-b`: a canopy over grey blocks, no millstone.
- `bone-mill-edit-a`: kept its red roofs.
- `hydroponic-pixen-a`, `frost-garden-pixen-a`: soil plates, no plant or no
  gaps. `chopping-block-a`: small, on a grass slab. `steam-pump-a`: a third
  of a tile wide.

What worked, for the production batches:

- **A Farm replacement is best made by editing the accepted Farm candidate**
  ("Turn each of the three raised beds of soil into …; Keep the three rows
  … exactly the same"): rows, gaps and plant sizes stay, so the `crop-rows`
  stamps are easy. Pixflux creations of a new field ignored the subject
  twice; Pixen creations drew it.
- **Colours by hex in an edit** moved the mushroom caps and the mill's
  roofs; "Change only one thing: …" kept the rest.
- **Ground removal**: "Remove all ground: … stand directly on a transparent
  background with nothing at all under them: no slab, no plate, no glass,
  no shadow" worked where "Erase only the flat slab" drew a glass plate.

To add or redo a recipe (the key is loaded by Node, never printed):

```sh
node node_modules/.bin/tsx --env-file=$HOME/.zshrc scripts/art/chibi-pipeline.ts \
  generate --exploration art/explorations/faction-buildings-2026-10 --ids <recipe>
npm run art:chibi -- accept --exploration art/explorations/faction-buildings-2026-10 \
  --id <recipe> --candidate 0 --notes "..." --native-pass --enlarged-pass --owners-pass --no-plate-pass --camera-pass
npm run art:faction-buildings-review
```

### Board study

`npm run art:faction-buildings-review` writes
[`art/pixellab/reviews/faction-buildings-study/`](../../art/pixellab/reviews/faction-buildings-study/)
(the list is in the script's header): `buildings-{x3,1x}.png` (today's
building beside the sample, Farms also as 3 x 3 blocks, and the faction's
City 2), `grass-x2.png`, the scenes
`scene-<faction>-{before,after}-{desktop,phone}-zoom-{1,0.75}.png` for
Undead, Martian, Dinosaur, Ice Folk (under its Snow) and Dwarf,
`scene-undead-after-grass-<candidate>-desktop-zoom-1.png` and
`before-after-contact.png`.

The scenes ([`scene.ts`](../../scripts/art/faction-buildings/scene.ts)) are
drawn by the real board host in the live look: an 8 x 6 patch with the
studied faction's city territory on the left and a Human territory with the
same buildings in the same places on the right. In the study the "after"
frame applied the proposal per cell without touching the game's code (a
721-variant registry, one entry per cell of the 16 x 16 Showcase board).
Since bead `pulp_wars-xdh.2` the game draws the looks itself: "after" is
the plain live look, "before" hides the faction art from the direction
registry, and `scene-<faction>-captured-*` gives the Human half to the
faction (see [In the game](#8-in-the-game)).

![Each faction's territory beside a Human one, today and proposed](../../art/pixellab/reviews/faction-buildings-study/before-after-contact.png)

![Every sample beside today's building](../../art/pixellab/reviews/faction-buildings-study/buildings-1x.png)

## 6. Weak spots and open questions

- **The Bone Mill is very dark.** Roofs, sails and tower are close in tone;
  at zoom 0.75 it is a black windmill shape with violet dots. It reads as
  "the Undead windmill", but a lighter slate tower would separate the sails.
  _Redone in production (`bone-mill-edit-d`, section 8): a light slate
  tower, near-black roofs and mid-grey sails._
- **The Graveyard's stones are round-topped**, like the Grave marker, but
  dark slate where the marker is pale. If the two are confused in play, the
  pointed-stone runner-up (`graveyard-pixen-b`) is in the run.
- **Roads under the new Farms.** The Hydroponic Farm's troughs are 23 px
  tall, so its gaps are under 4 px (the Farm's are 4 to 5); the Graveyard's
  are about 5 px, the Frost Garden's 9 px, the Mushroom Farm's 6 px.
- **The Mushroom Farm shows a faint join** every 70 px where the bed's
  outline is stamped, and its rows are uniform.
- **The Frost Garden's snow banks vanish on Snow** (white on white); the
  cabbages carry it there. On bare Grass the banks show.
- **The Solar Array keeps a few grey stepping stones** under its feet.
- **The Chopping Block's axe head is smooth grey**: it reads as a big axe,
  not clearly as stone.
- **Style.** The Pixen creations (Solar Array, Steam Pump, Chopping Block,
  Grinding Stone) are a little more detailed and saturated than the calm
  shared set; none takes a player colour.
- **Names in rules text** are settled (root, 2026-10-04): the board shows
  the faction's name; rules text keeps the generic name with "Counts as a
  Farm."

## 7. Production breakdown (proposed beads)

_All three were done as one bead, `pulp_wars-xdh.2`: see section 8._

1. **Runtime: faction building resolution** (`ui/presentation`): an
   improvement subject per faction (`IMPROVEMENT:<FACTION>:<ID>`, falling
   back to `IMPROVEMENT:<ID>`), resolved from the territory owner's faction
   in the board renderer, the tile dock and the technology card of that
   faction's viewer (through `factionImprovementSubjectV7` in
   `chibi-ui-art-v7.ts` once the Gallery bead that adds it has landed);
   Undead grass variants resolved the same way for Grass, the Forest ground
   and the Mountain fringe; tests that a captured city's buildings flip and
   that every other faction is unchanged.
2. **Runtime: names and flavour text** (`ui/presentation`): the display
   name in the board label, dock title and build button, the flavour line
   in the dock; rules texts unchanged; tests. Can be one bead with 1.
3. **Production art** (`asset-only`): `import` the nine accepted recipe
   chains into one batch per faction, register them in a manifest module,
   and bake the three gloam Grass tiles and two Forest composites as
   masters; `art:validate` then re-derives every crop-rows and seated
   master. Any redo from section 6 (a lighter Bone Mill) belongs here.

## 8. In the game

Bead `pulp_wars-xdh.2`. Purely visual: no engine rule, number, command,
save or identity changed.

### Production art

| Batch                | Faction  | Assets (subject)                                                                                                           | Recipes                                                                |
| -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `buildings-undead`   | UNDEAD   | `chibi-undead-graveyard` (`IMPROVEMENT:UNDEAD:FARM`), `chibi-undead-bone-mill` (`IMPROVEMENT:UNDEAD:WINDMILL`)             | `graveyard-pixen-a`; `bone-mill-edit-a` → **`bone-mill-edit-d`** (new) |
| `buildings-martian`  | MARTIAN  | `chibi-martian-hydroponic-farm` (`IMPROVEMENT:MARTIAN:FARM`), `chibi-martian-solar-array` (`IMPROVEMENT:MARTIAN:WINDMILL`) | `hydroponic-edit-a`; `solar-b` → `solar-b-edit-c`                      |
| `buildings-dinosaur` | DINOSAUR | `chibi-dinosaur-grinding-stone` (`IMPROVEMENT:DINOSAUR:WINDMILL`), `chibi-dinosaur-chopping-block` (`…:SAWMILL`)           | `grindstone-a`; `chopping-block-b`                                     |
| `buildings-ice-folk` | ICE_FOLK | `chibi-ice-folk-frost-garden` (`IMPROVEMENT:ICE_FOLK:FARM`)                                                                | `frost-garden-edit-a`                                                  |
| `buildings-dwarf`    | DWARF    | `chibi-dwarf-mushroom-farm` (`IMPROVEMENT:DWARF:FARM`), `chibi-dwarf-steam-pump` (`IMPROVEMENT:DWARF:WINDMILL`)            | `mushroom-flux-b` → `mushroom-flux-b-edit`; `steam-pump-b`             |

- The accepted recipe chains were brought in with `art:chibi -- import`
  (the record, the raw sheet and the receipt of each, no PixelLab call) and
  accepted again after a review at 1:1 and x4. The subject lines moved to
  `scripts/art/chibi/subjects/<FACTION>.json` under the new subjects. The
  imported records keep the prompt the exploration sent (its own
  `class-calm-building` and `class-crop-rows` fragments); a new recipe in
  these batches uses the production fragments.
- **The Bone Mill was redone** (2 PixelLab calls, 4 candidates). The
  exploration's `bone-mill-edit-b` was one dark tone. `bone-mill-edit-c`
  (from edit-b: a light slate tower) separated the tower, but its near-black
  sails still merged with the near-black roofs: rejected. `bone-mill-edit-d`
  (from edit-a, whose sails are a mid grey: "the red roofs become near-black
  charcoal slate (#2b2b31) … the stone walls become a lighter slate
  blue-grey (#8b92a3) with a mid-grey shade (#6a7082)") has three tones,
  near-black roofs, mid-grey ragged sails and a light slate tower, and is
  the accepted master (candidate 0).
- **The Undead ground** is baked by
  [`gloam-grass.ts`](../../scripts/art/faction-buildings/gloam-grass.ts)
  (`npx tsx scripts/art/faction-buildings/gloam-grass.ts bake`):
  `chibi-undead-grass-1..3` (the colour swap of `chibi-grass-1..3`) and
  `chibi-undead-forest-1..2` (the Forest bodies over `chibi-undead-grass-1`),
  with
  [`gloam-grass.json`](../../scripts/art/faction-buildings/gloam-grass.json)
  recording the swap and the hash of every source and output.
  `art:validate` re-derives them and fails if a Grass or Forest master
  changed without a new bake. The Mountain fringe needs no master: it draws
  the cell's Grass under the rocky ground.
- The registry is
  [`chibi-faction-buildings-art-manifest.ts`](../../src/assets/chibi-faction-buildings-art-manifest.ts),
  part of the direction registry.

### Runtime

- **Buildings.** `factionImprovementSubjectV7(improvement, faction)`
  ([`chibi-ui-art-v7.ts`](../../src/assets/chibi-ui-art-v7.ts)) returns
  `IMPROVEMENT:<FACTION>:<ID>` for the pairs of
  `FACTION_IMPROVEMENT_LOOKS_V7` and the shared subject otherwise. The
  board plan asks with the faction that owns the tile's territory
  (`tile.territoryOwnerId`), the tile dock too; the build buttons and the
  technology cards ask with the viewer's faction; the Gallery with each
  faction. A plan entry of a faction or building without a look is exactly
  the entry it was before.
- **Ground.** A terrain plan entry of a Grass, Forest or Mountain cell in
  Undead territory carries `territoryGround: "UNDEAD"`; its `artSubject`
  stays the terrain's. When the renderer resolves the tile it asks for
  `TERRAIN:UNDEAD:GRASS` or `TERRAIN:UNDEAD:FOREST`
  (`territoryTerrainSubjectV7`), and for the Undead Grass under a Mountain
  fringe. The direction's resolver takes these from the direction registry
  and tones them like every Grass tile.
- **Territory changes.** The board host builds its art registry and its
  resolver once and draws from the plan; nothing is rebuilt when a border
  moves. After a capture only the plan entries of the cells that changed
  owner differ, and the rasters they need are loaded once and cached.
- **Names.** [`faction-buildings-v7.ts`](../../src/render/faction-buildings-v7.ts):
  the name and the one flavour line of each building (the table of section
  3). The board label, the tile dock title, the viewer's build button and
  the Gallery cell use the name; the dock, the button's tooltip and the
  Gallery description show the flavour line, which ends "Counts as a
  Farm."; every rules text keeps the generic building.
- **Fallbacks.** The classic look and the LEGACY art set have no such
  rasters and draw the shared building and Grass; the names still follow
  the faction there.

### Evidence

`npm run art:faction-buildings-review` writes
[`art/pixellab/reviews/faction-buildings-study/`](../../art/pixellab/reviews/faction-buildings-study/):
the "after" scenes are now the game's own drawing, "before" hides the
faction art, `scene-<faction>-captured-*` is the frame after the faction
took the Human city, and `gallery-buildings-*` is the Gallery's Buildings
tab. Tests: `tests/unit/faction-buildings-render-v7.test.ts`,
`tests/unit/chibi-faction-buildings-assets.test.ts`,
`tests/integration/ruleset7-faction-buildings-dom.test.ts` and the Gallery
tests.

### Weak spots left

- The weak spots of section 6 stand, except the Bone Mill's tone. Its new
  tower is a pale slate blue, lighter than the Undead cities' dark stone;
  the sails still cover most of it at zoom 0.75.
- **The Rift** inside Undead territory keeps its green Grass (its art
  carries the ground); a gloam Rift would be new masters.
- **Snow, the Blizzard and Forest canopies** are unchanged over the Undead
  ground.
- In the classic look and the LEGACY art set a Graveyard is named
  "Graveyard" and drawn as the shared Farm.
