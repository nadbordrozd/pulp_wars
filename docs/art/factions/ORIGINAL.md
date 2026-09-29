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
| Village          | two or three small round cottages with straw thatch and a pale fence; no owner colour                      |
| City 1–3         | red-roofed cottages round a beige tower or keep with a banner; walls and corner towers grow with the level |

Building-specific notes (Windmill, Sawmill, Forge, Workshop, Market, Port,
Shipyard, Farm, Lumber Camp, Mine, Monument) are set in the batch beads and
the asset inventory. Each needs a unique silhouette at zoom 0.75.
