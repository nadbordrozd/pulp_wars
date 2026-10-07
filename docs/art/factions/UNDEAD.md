# Faction fragment: UNDEAD

**Status:** rewritten for the
[new visual direction](../VISUAL_DIRECTION_2026-10.md#17-undead-production)
in bead `pulp_wars-3tq.12`. The user's direction (2026-10-02): "I'm ok with
dark for the undead esp necromancers robes. but there should be a lot of
pale bones plus one accent color", and after the
[study](../VISUAL_DIRECTION_2026-10.md#15-undead-study): "let's go with the
violet-accented undead. generate the remaining sprites and merge it into the
game." The first version of this document (approved 2026-09-29, bead
`pulp_wars-vkq.11`) described owner-coloured garments in the key red; that
art is still in the game as the [Classic look](#the-classic-look).

The art pipeline reads the two `text` blocks under **Prompt fragment** and
**Negative fragment** below as layer 3 of every Undead prompt, so edit them
here and nowhere else. Recipes that were already generated keep the request
stored in their record (see the
[pipeline](../CHIBI_PIPELINE.md#fragment-changes-and-historical-records)).

The rules and roster come from the
[revision-13 Undead spec](../../product/RULESET_7_REVISION_13_UNDEAD.md)
(sections 2.3, 3, 6 and 10). Patrol Boat and Battleship reuse the Human art
([section 3](../../product/RULESET_7_REVISION_13_UNDEAD.md#3-undead-roster)).

## Identity

Cheerful storybook-spooky undead: grinning skeletons, sleepy zombies, a
wailing little ghost and a smug vampire, drawn as the same chunky board-game
pieces as the Humans. They are silly and a bit creepy-cute, never gory and
never horror; think a children's Halloween picture book, not a crypt. The
faction theme is attrition: death feeds them through Graves, raising,
infection and lifesteal.

The faction wears **fixed colours**: a lot of pale bone, near-black cloth,
pallid ash grey flesh and exactly one accent, violet. No sprite has an owner
area or a mask. The player is read from the seat-shaped plate under a unit,
the pennant on a city and the territory border.

## Prompt fragment

It names only a mood, materials, surfaces, colours and small motifs: no
figure and no place or building.

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

Gore and horror words keep the tone playful. Red cloth is excluded because
red is the Human faction's colour, green and blue skin because flesh is ash
grey (green is the Goblins'), and blue flames, yellow glows and gold because
the faction has one accent. A large glowing area would make the accent a
body colour.

```text
blood, gore, guts, exposed organs, open wounds, dripping, horror, creepy
realism, slime, red cloth, red tunic, red robe, red hood, green skin, blue
skin, orange flames, pumpkin, see-through, translucent, gun, musket, modern
clothing, blue flames, yellow glow, gold armour, large glowing area, moss
```

## Palette

Measured on the eight unit masters
([`palette.json`](../../../art/pixellab/reviews/chibi-batch-direction-undead/palette.json)).

| Role             | Colours                                    | Used for                                                                          |
| ---------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| Bone, lit        | `#e6e0c8`, `#fefbdd`, `#d0c9a9`            | skulls, ribs, limbs, claws, bandages, bone spikes and spurs, the Banshee's shroud |
| Bone, shaded     | `#bab497`, `#a59e84`                       | the warm grey shade of bone                                                       |
| Pallid flesh     | `#948884`, `#9e918b`, `#a89b93`            | Zombie, Ghoul, Vampire and Abomination skin: a warm ash grey, never green or blue |
| Dark cloth       | `#313135`, `#14181a`, `#100f10`            | robes, hoods, cloaks, smocks, the cape and coat                                   |
| Iron             | `#64717e`, `#818f9b`, `#3d424d`            | swords, the shield face, plates, manacles and chains                              |
| Tarnished bronze | `#574329`, `#966f40`                       | rims of the Skeleton's helmet and shield, the Lich's crown, the Vampire's buckle  |
| **Violet**       | lit `#a221ee`; `#6f06c9`, `#7614ca`        | eyes, flames, sparks, the Lich's orb, stitches, the Vampire's cape lining         |
| **Violet trim**  | `#a85df5` to `#b25df5` (lightened)         | one-pixel hems, hood edges and robe borders on dark cloth                         |
| Violet effects   | `#46247c`, `#7b36c9`, `#b06bf2`, `#dcc4ff` | the Wail, splash, Raise Dead and wisp sprites; code glows are `#c9a6ff`           |

Rules:

- **Bone carries each silhouette.** No unit is a featureless dark shape: the
  Skeleton and the Lich show a bare ribcage, the Ghoul and the Abomination
  have bone spikes and spurs, the Zombie a bone necklace and bandages, the
  Necromancer a skull staff, bone spikes and a white beard, the Vampire a
  pale face and bone buttons, and the Banshee is bone-white herself.
- **One accent.** Violet is on every unit, as small glows and thin trim.
  Nothing is red, orange, blue, cyan or green.
- **The accent is derived, not painted.** PixelLab's "bright violet" is a
  magenta (hue about 293°). The `undead-violet` accent preset of the
  [pipeline](../CHIBI_PIPELINE.md#the-accent-step-and-the-palette-swap-bead-pulp_wars-3tq12)
  finds those pixels by colour, moves them to hue 274°, and lightens
  one-pixel trim that sits on dark cloth (saturation at most 0.62, value at
  least 0.96). The lightened trim has a contrast of 3.4 against the cloth
  and 4.7 against its shade; the unlightened violet had 2.5 and 3.4.
- **Against the Violet player** (`#a277d2`): the lit accent differs by 57
  (CIE76), the lightened trim by 34 and the effect sprites' lit violet by 25. The accent areas stay small, and a plate is a flat pastel shape under
  the feet, so the two are not confused; a Violet player's Undead simply
  look matched.
- **Metal** is iron, with bronze on rims only. The Skeleton's helmet dome is
  blackened iron, so it does not read as Human polished steel.
- **Moss is gone** from the look (the first version used grey-green moss as
  a third colour).

## Silhouette language

This guides the subject lines; it is not sent to PixelLab.

- **Heads tell the faction apart at zoom 0.75.** Undead heads are pale ivory
  skulls or pallid faces with glowing violet eyes. Every head still takes
  about half of the figure's height, with a grin or a funny expression
  rather than a snarl.
- **Ragged edges.** Every garment ends in torn zigzag hems, against the
  Humans' neat tunics.
- **Posture varies by role**, where every Human stands upright: the Ghoul
  lopes on all fours, the Zombie shambles with its arms out, the Banshee
  floats, the Lich towers, the Vampire spreads his cape.
- **Iron and bone, never wood.** No bows, no horses, no wooden shields.
- **Small violet lights** (eyes, the Necromancer's staff, the Lich's orb)
  are the only glow, and always small.

## Roster

Batch [`direction-undead`](../../../scripts/art/chibi/batches/batch-direction-undead.json).
Every unit is an `edit-image-pixen` chain on its accepted classic sprite, so
the canvas, the anchor and the footprint are unchanged. The subject lines
(keys `UNIT:UNDEAD:<ROLE>/BONE` and `PORTRAIT:UNDEAD:<ROLE>/BONE` in
[`subjects/UNDEAD.json`](../../../scripts/art/chibi/subjects/UNDEAD.json))
describe the result, for a fresh creation if one is ever needed.

| Unit (role)                | Canvas   | Accepted recipe           | What it shows                                                                                                  |
| -------------------------- | -------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Skeleton (`FIGHTER`)       | 56 x 80  | `skeleton-bone-edit-e`    | bare ribcage, black loincloth and crest, blackened helmet and iron shield with bronze rims, violet eyes        |
| Ghoul (`RAIDER`)           | 72 x 88  | `ghoul-bone-edit-b`       | black hooded cloak with bone spikes, pallid face and limbs, ivory claws, violet eyes and mouth                 |
| Banshee (`MARKSMAN`)       | 56 x 80  | `banshee-bone-edit-a`     | a pale spirit: bone-white shroud with a dark hood lining, pale hair, violet eyes, mouth and flames             |
| Zombie (`GUARD`)           | 56 x 80  | `zombie-bone-edit-d`      | ash grey skin, charcoal smock, bone necklace, bandaged arms, big violet eyes, violet stitches on cheek and arm |
| Necromancer (`CAPTAIN`)    | 56 x 80  | `necromancer-bone-edit-c` | black hood and robe with violet trim, bone spikes, skull staff with a violet flame, white beard                |
| Lich (`CATAPULT`)          | 72 x 88  | `lich-bone-edit-c`        | crowned skull, bare ribcage in an open black robe, bone arms and feet, violet orb, bronze crown                |
| Vampire (`KNIGHT`)         | 72 x 88  | `vampire-bone-edit-b`     | black cape with a violet lining, black coat with bone buttons, pale grey face, violet eyes and flames          |
| Abomination (`JUGGERNAUT`) | 88 x 104 | `abomination-bone-edit-b` | ash grey patchwork skin, black smock, bone spurs on iron shoulder plates, four violet flames                   |
| Patrol Boat, Battleship    | Human    | (unchanged)               | shared ships with the player-coloured sail                                                                     |

Each unit has a 48 x 48 portrait (`chibi-direction-portrait-undead-<unit>`)
edited from its classic portrait, and the four command icons (Raise Dead,
Devour, Wail, Frenzy) have a violet version
(`chibi-direction-icon-action-<name>`).

The treasure-chest reward unit of the faction is the Vampire
(`treasureUnitRole: "KNIGHT"`); the Skeletons that Raise Dead raises and the
Zombies that Infect and a bite raise are the roster's own Skeleton and
Zombie, so no further sprite exists.

The Undead pass (`pulp_wars-w49.13`, `pulp-wars-poc-7r51`,
[the tuning record](../../product/RULESET_7_TUNING_UNDEAD.md)) changed three
unit rules and no art: the Skeleton has Bones (Defense 3 against an attack
from two or more tiles), the Vampire has Escape (it may move again after an
attack it survives), and the Abomination has Infect (what it kills rises as
a Zombie, with the Zombie's own rising effect and sprite). Bones is a text
line on the unit card and has no icon; Escape and Infect show as they do on
the Human Raider and the Zombie. If an art bead gives Bones an icon, the
vocabulary is the command icons' (above): a bare ribcage with an arrow
passing through it, in violet.

Its correction (the same bead and identity) made no art either. Two
things stand in until an art bead: the Undead technology **Pestilence**
(the Undead name of Explosives: the Liches plague) is drawn with the
shared Explosives node icon, and the Ghoul's **Carrion** (+1 Attack
against a Bitten or Plagued unit) is a text line on the unit card with no
icon. For that bead, in the same vocabulary: a Pestilence node icon (a
cracked flask or censer in the Plague status's colour), and a Carrion
ability icon (a jawbone over the bite mark of the Bitten status).

## Cities and villages

The Undead necropolis has a set of its own in the direction's calm building
style (`calm-settlement`, subject keys `CITY:UNDEAD:<level>/CALM`): dark
slate stone, near-black slate roofs, pale bone trim and violet windows. No
roof takes a player colour; the owner's pennant is drawn in code on a tower
(`DIRECTION_FLAG_ANCHORS_V7`), with the seat shape, gold for the capital.

| Level | Asset                           | Canvas  | What it shows                                                                           |
| ----- | ------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| 1     | `chibi-direction-undead-city-1` | 80 x 80 | a round crypt tower with a violet window, three crypts with bone trim, a skull door     |
| 2     | `chibi-direction-undead-city-2` | 88 x 88 | black-roofed crypts round a pale bone bell tower with violet windows, inside a low wall |
| 3     | `chibi-direction-undead-city-3` | 96 x 88 | a dark ring wall with four cone-roofed towers, a bone gate and a violet-windowed spire  |

The canvases are smaller than the classic ones (88 x 96, 96 x 100,
96 x 104): City 1 and 3 stay inside the Human direction's canvases, and
City 2 is 8 px taller than the Human City 2 because of its bell tower. The
neutral village (`SITE:VILLAGE`) is the shared one.

## Ability effects and status markers

| Cue                         | Default look                                           | Why                                                                                                   |
| --------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Wail (`EFFECT:WAIL`)        | violet sprite, violet rings                            | the faction's magic                                                                                   |
| Lich splash                 | violet sprite                                          | the faction's magic                                                                                   |
| Raise Dead (`EFFECT:RAISE`) | bone hands with violet wisps                           | the faction's magic                                                                                   |
| Spirit wisp                 | violet sprite (Infect, a bite rising, lifesteal)       | the faction's magic                                                                                   |
| Raise Dead target preview   | violet outline `#c9a6ff`, like the Wail radius         | one colour for the faction's abilities; it was green                                                  |
| Plague marker and puff      | **unchanged**: grey-green cloud `#9fac8a`              | an affliction on any faction's unit, not the caster's magic; a dull green is the opposite of the glow |
| Bitten marker               | **unchanged**: slate jaws, ivory teeth                 | an affliction, as above                                                                               |
| Cure sparkle                | **unchanged**: white                                   | a Human Captain's Tend cures; it is not Undead magic                                                  |
| Devour and splash previews  | **unchanged**: coral and orange                        | they mark damage and healing amounts, like every faction's previews                                   |
| Grave marker                | **unchanged**: a neutral stone tombstone drawn in code | it belongs to no faction                                                                              |
| Undead badge of a stand-in  | **unchanged**: bone on violet-black                    | it already agrees                                                                                     |

The four violet effect sprites are the accepted sprites of batch
`effects-undead` in the palette
`scripts/art/chibi/palettes/undead-violet.png`: a palette swap, so every
shape is the one that was reviewed.

## What is live

The default look of the CHIBI art set draws all of the above for an Undead
player: units on the board, the selection dock, portraits on train buttons,
cards and the technology tree, the command icons, the cities and the
effects. A raster that fails to load falls back to the classic asset of
that piece. The setup screen has no faction art: it offers the faction in a
select.

### The Classic look

The developer option "Classic look (previous art)" and the LEGACY art set
are unchanged. The Classic look draws the first Undead art (batches
`undead`, `5-undead`, `cities-undead`, `effects-undead`): garments, roofs
and banners in the owner's colour through a mask, slate blue-grey skin and
iron, pale blue flames and effects, grey-green moss, and the green Raise
Dead preview. Their records keep the prompt fragment they were generated
with (bleached ivory bone shaded cool grey, "never brown", the key colour
`#d8262c` on a garment covering torso and legs). That fragment is no longer
the faction's: a new classic-style asset would need it restored in an
exploration run.

## Decisions

Approved by the user on 2026-09-29 and still in force:

1. **Banshee:** floats with no feet; the tip of her shroud is the lowest
   thing in the image and stands on the tile.
2. **Vampire:** on foot, with a huge bat-wing cape; no mount.
3. **Ghoul:** alone on all fours in the large 72 x 88 canvas; no mount.
4. **Zombie:** arms stretched forward; no shield and no weapon.
5. **Tone:** playful and goofy, never menacing, gory or horror.
6. **Cities:** the Undead have their own City 1-3 (2026-10-01); the village
   is shared.
7. **Grave marker:** unowned; the board draws a small code-drawn tombstone.

Decided in bead `pulp_wars-3tq.12` under the user's direction of
2026-10-02 (each is described in the
[production section](../VISUAL_DIRECTION_2026-10.md#17-undead-production)):

8. **Accent:** violet at hue 274°, lightened on thin trim over dark cloth.
9. **Banshee:** a bone-white shroud, not a dark one; opaque, not
   translucent.
10. **Vampire:** a violet cape lining instead of a red one.
11. **Lich:** bare ribs in an open robe; a bronze crown; the orb is the
    largest glow of the faction.
12. **Zombie:** violet stitches and bigger glowing eyes.
13. **Moss is dropped;** bronze is allowed on rims and the crown.
14. **Plague, Bitten and cure** keep their colours; **Raise Dead's preview**
    becomes violet.
15. **Cities:** a new calm-style set with a code-drawn pennant.

## Ninth unit: the Wight (beads `pulp_wars-w49.17` and `pulp_wars-2yc.34`)

Ruleset `7r55` gives every faction a ninth land unit ([what was
built](../../product/RULESET_7_NINTH_UNIT.md)). The Undead one is the
**Wight** (engine role `SWORDSMAN`), the heavy line unit. It was drawn as the
Skeleton under a steel disc lettered **W** until bead `pulp_wars-2yc.34` gave
it its own art.

- **Art slot.** `UNIT:UNDEAD:SWORDSMAN` and `PORTRAIT:UNDEAD:SWORDSMAN`, the
  ninth art slot of the faction (`unitArtRoleV7` in
  `src/assets/chibi-art-v7.ts`): `chibi-direction-undead-wight` (56 x 80,
  `STANDARD_UNIT`) and `chibi-direction-portrait-undead-wight` (48 x 48), fixed
  colours, no mask, accent `undead-violet`. Recipes `wight-*` and
  `portrait-wight-a` in batch `direction-undead`; 4 PixelLab calls.
- **Sprite** (`wight-c`, 53 x 77 px): a closed iron great helm with two violet
  eye slits and a spiky tarnished bronze crown, weathered grey iron plate with
  rust patches and bronze rims, two round pauldrons, a mail skirt with a violet
  hem, bone hands and feet, and a notched greataxe held up beside the helm; no
  shield. An edit of the accepted Skeleton (`wight-a`), then a recolour, so the
  body, feet and scale are the Skeleton's.
- **Told apart at board size:** the Skeleton shows a pale skull, bare ribs and
  a round shield; the Lich a pale skull under a crown, a wide robe and a violet
  orb; the Wight is the only faceless one, a block of grey iron with a crown
  and an axe.
- **Portrait** (`portrait-wight-a`): the Skeleton's bust redrawn with the same
  helm, crown, pauldron and axe blade.
- **Violet, not pale blue.** The first description gave the eye slits a pale
  blue light; the faction has one accent, so they are the roster's violet.
- **Light.** `lighting-qa` reads the sprite as lit from the right (faces
  -12.7) and the portrait too (-32.8): the pale axe blade is at the right of
  both, and the helm's lit ridge is at its centre. On a unit the measure lists
  sprites to look at, as the [art direction](../ART_DIRECTION.md) says.
- **Rejected.** `wight-a`: the right figure but near-black all over (mean L\*
  29, 72% dark), with violet only in the eye slits. `wight-b`, a fresh
  creation: the bare skull shows under a crown (it reads as the Lich), the
  armour is orange-brown and the weapon a sword.
- LEGACY (`?art=legacy`) and the developer option "Classic look" have no Wight
  art: there it falls back like every faction subject, to the Human unit of
  the slot under the Undead badge.
