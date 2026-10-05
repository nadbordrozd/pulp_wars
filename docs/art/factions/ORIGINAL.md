# Faction fragment: ORIGINAL (Humans)

**Status:** baseline faction for the chibi migration. The tile-80 test
Fighter and Marksman, which the user chose, show the intended look. The
prompt and negative fragments were rewritten in bead `pulp_wars-ldq` to
follow the [faction-layer rules](README.md) and need user approval before
batch 3 uses them.

Batches 1 and 2 were generated with the earlier fragment, which named
humans, towns, shields and bows. Their records and receipts
(`scripts/art/chibi/records/batch-1.json`, `batch-2.json` and
`art/pixellab/submissions/`) keep that text verbatim as each request was
sent, and nothing recomputes an accepted asset's prompt, so the accepted
pieces stay valid. The fragment below applies only to recipes generated from
now on.

The exploration run
[`art/explorations/original-fragment-check/`](../../../art/explorations/original-fragment-check/)
(4 PixelLab calls, $0.04) replayed the batch-1 Fighter and Village and the
batch-2 Guard requests that leaked under the old fragment, with the same
seeds and subject texts and no recipe exclusions, plus a batch-3 Farm: no
bow or quiver on either unit, no figure in the Village or the Farm, and the
Guard's red-brown material fell from 4.1% to 0.8%. Its `review/` folder
holds the old-versus-new sheets.

## New direction (October 2026): crimson and gold, fixed colours

**Status:** the user chose this direction on 2026-10-02 (recorded on bead
`pulp_wars-3tq.4`); bead `pulp_wars-3tq.5` produced the art (batch
`direction-human`) and bead `pulp_wars-3tq.6` made it the default look. The
sections further down describe the previous art, which the game still draws
with Settings > Developer tools > Classic look. See
[VISUAL_DIRECTION_2026-10.md](../VISUAL_DIRECTION_2026-10.md#13-live-default).

- **Identity:** a proud high-medieval kingdom of about 1250: knights and
  men-at-arms in heraldry.
- **Faction colours, fixed:** deep crimson cloth (`#a8202c` and its shades)
  with gold-yellow trim, gold-yellow lions and crosses, polished steel and
  mail, cream linen, dark brown leather. Cities are pale warm sandstone with
  cream plaster, dark oak framing and terracotta roofs.
- **No garment recolour:** a Human unit, city or portrait looks the same for
  every player. It has no owner area and no mask (`fixedColours` in the
  registry). The player is read from the base plate under the unit, the
  pennant on a city, the territory border and the interface. Crimson may be
  close to a player colour (Coral); that is accepted.
- **Ships** are shared by every faction and are not converted: they keep the
  player colour on the sail.

| Role       | New look (the signature prop is unchanged)                                      |
| ---------- | ------------------------------------------------------------------------------- |
| Fighter    | crimson cloth tunic with a gold cross, small round wooden shield, gold band     |
| Raider     | crimson hooded cloak with a gold trim over a cream tunic, on the sandy pony     |
| Marksman   | crimson hood with a gold trim, cream gambeson with a crimson and gold tabard    |
| Guard      | steel plate, crimson tower shield from chin to ground, gold cross, steel border |
| Captain    | crimson hat with a gold band and white feather, crimson banner with a gold lion |
| Catapult   | the same frame; crimson pennant with a gold stripe, crimson cloths with gold    |
| Knight     | crowned great helm, crimson caparison with a gold trim, lance pennant           |
| Juggernaut | gold crown on the helm, crimson tabard with a gold lion, gold-rimmed pauldrons  |

Every unit and portrait of this direction is an `edit-image-pixen` edit of
its accepted sprite, so silhouette, scale and feet are unchanged; an edit
sends only its instruction, so the prompt fragment below was not used. The
subject lines `UNIT:<ROLE>/HERALDIC`, `PORTRAIT:<ROLE>/HERALDIC` and
`CITY:<level>/CALM` in
[`ORIGINAL.json`](../../../scripts/art/chibi/subjects/ORIGINAL.json)
describe the new look in full. A fresh creation of a Human unit needs this
faction text instead of the prompt fragment below (it is the demo's proven
text; it becomes the prompt fragment when the old look is retired):

```text
Faction: a proud high-medieval kingdom around the year 1250: knights and
men-at-arms. Its fixed colours are deep crimson red cloth with gold-yellow
trim and gold-yellow heraldic lions and crosses, over polished steel
chainmail and helmets and cream linen; steel is shaded with darker
blue-grey, cloth with a deeper tone of its own colour, leather is dark
brown.
```

### Fighter and Guard (bead `pulp_wars-2o7.3`)

The user (2026-10-05): "human units - fighter and guard are quite similar.
it should be more obvious that the guard is the more defensive unit and the
[fighter] is the basic soldier. maybe if the guard looked a bit more armored
with a bigger shield and the fighter's shield was more basic." Both carried
a crimson shield with gold heraldry about as big as their body. They were
redrawn in place (same asset ids, canvases and anchors; recipes `*-r6-*`
in batch `direction-human`, edits of the accepted sprites), with their
portraits; 10 PixelLab calls.

- **Fighter** (`fighter-r6-a`, 53 x 72 px): the basic soldier. A small
  plain round wooden shield with a steel rim and boss, a crimson cloth
  tunic with the gold cross over cream linen sleeves, no mail. Helmet,
  crest, sword and face are unchanged. Rejected: the same shield with the
  mail kept (darker), and a levy swordsman with no crest and almost no
  crimson (a different, smaller soldier).
- **Guard** (`guard-r6-d`, 51 x 73 px): the defensive unit. Full steel
  plate with a big round pauldron, and a rectangular crimson tower shield
  with a gold cross and a riveted steel border that stands on the ground
  and covers him from chin to feet; kettle helmet, face and spear kept.
  Rejected: plate with the old shield, a giant pavise that hid the face and
  the spear, a shield that only grew to the knees, and one with a grey
  plate under it.
- **Told apart by silhouette:** a round shield beside the body, a crest
  and a raised sword against a rectangle with a head and a spear.
- The Fighter's portrait is also the Human emblem of the setup form; it
  keeps the helmet, crest and cross and shows the round shield.

The other factions are **not** converted: Undead, Goblin and Dinosaur units,
cities and portraits still carry the owner colour on a mask.

## Identity

Grounded storybook medieval humans: settlers, soldiers and builders. They are
the game's baseline, organised and practical, with no magic (see the
[tech tree design principles](../../product/PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md)).
The fragment itself names no people and no buildings: batches 1 and 2 showed
that "humans … towns … shields and bows" put soldiers into villages and
cities and bows and quivers on the Fighter, Knight and Juggernaut. Bodies
and architecture live in the subject lines.

## Prompt fragment

```text
Faction: cheerful, practical storybook medieval. Everything is made of woven
cloth, light steel, pale birch wood, cream plaster and beige cobblestone,
with stitched hems, steel rivets and carved trims as details; cloth is
shaded with a deeper tone of its own colour, steel with darker blue-grey,
wood with darker straw yellow, plaster and stone with cool grey, never brown.
```

## Negative fragment

```text
gun, musket, rifle, pistol, cannon, gunpowder, top hat, bicorne, tricorne,
Napoleonic uniform, modern clothing, steel plate full armour, magic glow,
glowing runes, wings, bronze, copper, rust, brown boots, brown leather, dark
brown shading, red-brown
```

## Palette

- Owner colour: the shared key colour on a garment that covers the torso and
  legs (tunic, long coat-tunic, tabard, hooded cloak) plus a hat, hood, crest
  or plume; on horse barding, tower shields and banners; on roofs, cone roofs
  and banner flags; on sails.
- Secondary colours: light steel grey (dark slate grey for boots, belts and
  hooves, light grey for gloves), pale birch or straw-yellow wood, and cream
  plaster with beige cobblestone. No brown anywhere: wood is pale yellow,
  never orange or tan-brown.
- The neutral Village uses no owner colour: golden-yellow straw thatch
  instead of red roofs.

## Silhouette language

This guides the subject lines; it is not sent to PixelLab.

- **Bodies:** stocky chibi humans with a huge round head about half of the
  figure's height, a tiny sturdy body and a friendly face whose mouth is a
  tiny dark line, never red. One oversized signature item per role; a unit
  carries only its own role's weapons, so bows and quivers belong to the
  Marksman alone (other units add `bow, quiver` to their `negativeAddendum`).
- **Settlements:** chunky cottages with cream plaster walls and solid bright
  red tile roofs, pressed round a short round beige cobblestone tower or keep
  with a bright red cone roof and a big red banner flag; cities add beige
  cobblestone walls and red-coned corner towers as they grow. Every
  settlement line ends "Buildings only." and its recipes add
  `soldier, person, character, archer` to their `negativeAddendum`.
- **Improvements (batches 3–4):** one building each, in the same vocabulary
  (cream plaster, pale birch timber, beige cobblestone, bright red tile or
  cloth where the owner colour is wanted), with a unique silhouette at zoom
  0.75; each line gives the architecture in full and ends "Buildings only."
- **Ships (batch 4):** small wooden sailing craft with pale birch hulls and
  bright red sails; the Battleship is a two-mast medieval carrack.
- **Portraits and icons (batch 5):** the same bodies and materials as the map
  pieces; each portrait line repeats its unit's body language in full.

## Roster notes

| Role or building | Distinguishing silhouette                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Fighter          | crested helmet, oversized short sword, round plain steel shield                                            |
| Raider           | hooded rider on a small sandy-yellow pony, big red hooded riding cloak, raised hand axe, no helmet         |
| Marksman         | tall red pointed hood and cape, tall pale longbow, quiver, no shield                                       |
| Guard            | huge red tower shield and long spear, heavy brimmed helmet, wide stance                                    |
| Captain          | soft red cap with a big white feather, tall pole with a big square red banner, horn at the hip, no shield  |
| Catapult         | pale wooden catapult on four chunky wheels with a red pennant and one small crew figure                    |
| Knight           | plumed great helm and upright lance on a big white horse in red barding with a cream trim                  |
| Juggernaut       | giant armoured brute with steel pauldrons, a huge warhammer and a red tabard to the knees, no shield       |
| Patrol Boat      | small single-mast sailing boat with an owner-colour sail                                                   |
| Battleship       | larger two-mast warship, a medieval galleon or carrack                                                     |
| Embarked form    | low mastless rowing barge with oars and cargo under a big red tarp, a small pennant                        |
| Windmill         | cream tower with a red cone roof and four big red cloth sails in an X (batch 4)                            |
| Sawmill          | open lean-to under a red tile roof with a big toothed steel saw blade and a log stack (batch 4)            |
| Forge            | squat smithy with a red roof, a tall grey chimney with smoke and a big anvil (batch 4)                     |
| Workshop         | tall timber-framed house with a steep red roof and a huge steel cogwheel on the gable (batch 4)            |
| Market           | round red-and-cream striped market pavilion with a pennant over crates of goods (batch 4)                  |
| Shipyard         | boathouse on stilts with red roofs, a tall pale crane and an unfinished boat hull (batch 4)                |
| Village          | two or three small round cottages with straw thatch and a pale fence; no owner colour                      |
| City 1–3         | red-roofed cottages round a beige tower or keep with a banner; walls and corner towers grow with the level |

Building-specific notes (Windmill, Sawmill, Forge, Workshop, Market, Port,
Shipyard, Farm, Lumber Camp, Mine, Monument) are set in the batch beads and
the asset inventory. Each needs a unique silhouette at zoom 0.75.
