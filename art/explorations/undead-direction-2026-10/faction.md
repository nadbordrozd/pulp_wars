# Faction fragment: TEST-UNDEAD-BONE (exploration copy)

**Status:** TEST ONLY. Undead units in fixed faction colours, with no
owner-colour area: a lot of pale bone, dark cloth, pallid grey flesh and
exactly one glowing accent colour. It is the faction layer of the Undead
visual-direction study (bead `pulp_wars-3tq.11`, see
[VISUAL_DIRECTION_2026-10.md](../../../docs/art/VISUAL_DIRECTION_2026-10.md#15-undead-study)).
It is not a faction and never produces production art. Unlike
[UNDEAD.md](../../../docs/art/factions/UNDEAD.md) it allows warm ivory,
tarnished bronze and a saturated glow: with no key colour to extract and no
player colour on the sprite, a drift towards brown, Gold, Teal or Violet no
longer breaks a mask or names a player.

The fragment names the accent as violet. The study generates every base
sprite with a violet accent and derives the cyan and green options from it
by a recorded hue remap of the accent pixels only (see
`scripts/art/undead-direction/samples.ts`), so the three options differ in
nothing but the accent.

## Prompt fragment

```text
Faction: cheerful spooky storybook, playful and never scary. Their fixed
colours: a lot of smooth pale warm ivory bone (skulls, ribs, bone trinkets),
ragged near-black charcoal cloth with torn zigzag hems, pallid ash grey
skin, small pieces of tarnished bronze and dark rusted iron, and exactly one
accent colour, a bright glowing violet, only as small glows and thin trim:
eye sockets, magic flames, a staff head, a hem. Bone is shaded warm grey,
cloth near-black.
```

## Negative fragment

```text
blood, gore, guts, exposed organs, open wounds, dripping, horror, creepy
realism, slime, red cloth, red tunic, red robe, red hood, green skin, blue
skin, orange flames, pumpkin, see-through, translucent, gun, musket, modern
clothing, blue flames, yellow glow, gold armour, large glowing area
```
