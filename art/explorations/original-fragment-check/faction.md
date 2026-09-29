# Faction fragment: TEST-ORIGINAL-FRAGMENT (exploration copy)

**Status:** TEST ONLY. An exploration copy of the proposed ORIGINAL (Human)
fragment from bead `pulp_wars-ldq`, used to check it before approval. It is
not a faction and never produces production art. The two text blocks below
must stay byte-identical to the ones in
[docs/art/factions/ORIGINAL.md](../../../docs/art/factions/ORIGINAL.md).

The recipes replay batch-1 and batch-2 requests that leaked figures or bows
under the old fragment (same seed, subject text and size, no recipe
addenda), plus one batch-3 building, so only the faction layer differs.
Every candidate is recorded as rejected: they are checks, not art. The
`review/` sheets put the old candidate (left) beside the new one (right):
`old-vs-new-x1.png`, `old-vs-new-x4.png`, `zoom-x8.png` (Fighter, Guard)
and `buildings-x6.png` (Village, Farm).

## Result

| Check                                        | Old fragment                    | New fragment                                       |
| -------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| Fighter (batch-1 fighter-a replay)           | bow and quiver on the back      | no bow, no quiver; red cloth mask on the face      |
| Village (batch-1 village-a replay)           | a soldier inside, red-brown     | no figure, no red; grey tower and slab remain      |
| Guard (batch-2 guard-a, without exclusions)  | 4.1% red-brown (with exclusion) | no bow or quiver; 0.8% red-brown; red face shading |
| Farm (new batch-3 line, no figure negatives) | not run                         | no figure; slab under it, like every building      |

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
