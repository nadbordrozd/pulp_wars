# Faction fragment: UNDEAD

**Status:** draft for bead `pulp_wars-vkq.11`; needs explicit user approval
before any generation. Written from [FACTION_TEMPLATE.md](FACTION_TEMPLATE.md)
under the rules in the [README](README.md), which come from the
faction-layer dry run (`pulp_wars-tt3.1`).

The art pipeline reads the two `text` blocks under **Prompt fragment** and
**Negative fragment** below as layer 3 of every Undead prompt, so edit them
here and nowhere else. The subject lines further down are drafts: after
approval, the sample bead (`pulp_wars-vkq.12`) copies them into
`scripts/art/chibi/subjects/UNDEAD.json`.

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

## Prompt fragment

59 words. It names only a mood, materials, surfaces, colours and small
motifs: no figure (not even "undead" or "ghost") and no place or building.

```text
Faction: cheerful spooky storybook, playful and never scary. Everything is
made of smooth bleached ivory bone, ragged cloth with torn zigzag hems, dull
dark iron and weathered grey stone, with small grey-green moss patches,
stitched seams and small cold pale blue flames as details; bone is shaded
with cool grey, iron and stone with darker slate blue-grey, never brown.
```

## Negative fragment

Gore and horror words keep the tone playful. Wood is excluded because every
Undead handle, staff and shield is iron or bone, and wood drifts brown. Cyan,
green and purple glows are excluded because they sit close to the Teal and
Violet player colours; orange flames and pumpkins sit close to Coral and
Gold. See-through ghosts would break the black outline and the owner mask.
It ends with the red-brown drift words the dry run needed for a bone and
metal faction, plus brown cloth, verdigris (tarnish drifting green) and
maroon.

```text
blood, gore, guts, exposed organs, open wounds, dripping, horror, creepy
realism, rotting flesh, slime, glowing green, cyan glow, purple magic glow,
orange flames, pumpkin, see-through, translucent, wood, timber, gun, musket,
modern clothing, brown boots, brown leather, brown cloth, bronze, copper,
verdigris, rust, dark brown shading, red-brown, maroon
```

## Palette

- **Owner colour:** only the shared key colour `#d8262c`, on a garment that
  covers the torso and legs (shroud, tabard, smock, robe, cloak, cape) plus a
  hood, crest or collar, and on banners. Never on bone or skin: a red
  skeleton or a red-skinned zombie stays under the 15% mask minimum, as the
  dry run's red-plated robots did. Every owner garment has torn zigzag hems.
- **Secondary colours (three):**

| Colour                     | Approximate values                                 | Used for                                              | Why it is safe                                                                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bone ivory                 | `#ece6d2`, shaded cool grey `#a6abb5`              | skulls, bones, claws, beards, hair, small trim        | Pale and nearly unsaturated, so it is far lighter than grass `#8ab85c` and every player colour. It must stay cool: a yellow ivory would drift towards Gold `#e2b63f`, hence "cool grey" shading, never brown.                                                               |
| Slate blue-grey (one ramp) | dark `#3e4859`, mid `#7f8ca0`, pale glow `#d2e2f6` | iron, stone, undead skin, boots, glowing eyes, flames | A desaturated blue, clearly off the green-cyan Teal `#28b7a4` and the saturated purple Violet `#a277d2`. The dark end contrasts with grass by value, the pale glow by value and hue. Glows stay pale blue-white and small, never cyan, so they cannot read as a Teal owner. |
| Grey-green moss (accents)  | `#7c8c6c`                                          | small moss patches only                               | Close to grass in value, so it is never a large area; greyer and bluer than the grass so it does not merge, and far from Teal in saturation.                                                                                                                                |

Black is the shared outline, eye sockets and the Vampire's hair; it does not
count as a secondary colour. Nothing is red, red-brown, orange or brown, so
the Coral owner reads cleanly, and no large area is yellow or purple.

## Silhouette language

This guides the subject lines; it is not sent to PixelLab.

- **Heads tell the faction apart at zoom 0.75.** Humans wear steel helmets
  and red hoods over human faces; Undead heads are pale ivory skulls or pale
  blue-grey faces with big dark eye sockets or big round eyes. Every head
  still takes about half of the figure's height, with a grin or a funny
  expression rather than a snarl.
- **Ragged edges.** Every owner garment ends in torn zigzag hems, against
  the Humans' neat tunics. The hems also make the owner area big and flat.
- **Posture varies by role**, where every Human stands upright: the Ghoul
  lopes on all fours, the Zombie shambles with its arms out, the Banshee
  floats, the Lich towers, the Vampire spreads his cape.
- **Iron and bone, never wood.** Weapons and staffs are dull dark iron or
  bone, oversized and a little notched. No bows, no horses, no shields made
  of wood.
- **Small pale blue lights** (eyes, the Necromancer's staff, the Lich's orb)
  are the only glow, and always small.
- **Settlements:** shared with the Humans (see
  [Cities and villages](#cities-and-villages)).

## Subject lines

Draft lines for `scripts/art/chibi/subjects/UNDEAD.json`, written like the
Human lines in `scripts/art/chibi/subjects/ORIGINAL.json`. Each unit line
carries the full body language and puts the owner colour on a garment that
covers the torso and legs. Keys are the mechanical role subjects; the
canvas classes follow the [asset inventory](../CHIBI_ASSET_INVENTORY.md).

**Skeleton** (`UNIT:FIGHTER`, standard unit 56 x 80):

```text
Subject: Skeleton, a chunky cute friendly skeleton warrior with a huge round
ivory skull head about half of the figure's height and a tiny sturdy body:
big dark round eye sockets with tiny pale blue pupils and a wide toothy grin,
a dented dark slate-grey iron half-helmet with a big bright red crest, a big
bright red ragged tabard with torn zigzag hems covering the chest, belly and
legs down to the knees, thin ivory bone arms and shins, an oversized notched
light grey iron sword held up in the right hand, a round dark slate-grey
iron shield with a small ivory skull boss on the left arm, ivory bone hands
and feet; simple shapes and very few details.
```

**Ghoul** (`UNIT:RAIDER`, large unit 72 x 88):

```text
Subject: Ghoul, a chunky cute hunched ghoul loping forward on all fours,
wide and low, filling the whole width of the image: a big round bald head
about half of the body's height with pale blue-grey skin, big round pale
blue eyes, pointy ears and a toothy grin, a big bright red ragged hooded
cloak with torn zigzag hems over the head, back and hips, trailing behind,
long thin pale blue-grey arms ending in big ivory claws, bony pale blue-grey
legs and feet; no weapon, no mount; simple shapes and very few details; the
hands and feet are the lowest thing in the image; clearly a fast crouching
runner, not an upright soldier.
```

**Banshee** (`UNIT:MARKSMAN`, standard unit 56 x 80):

```text
Subject: Banshee, a chunky cute wailing ghost lady with a huge round head
about half of the figure's height and a small floating body: a pale
ghost-blue face with big dark eyes and a wide round open mouth mid-wail,
both small pale ghost-blue hands raised beside her cheeks, long flowing
ivory-white hair, a big bright red hooded shroud gown with torn zigzag hems
covering her from the shoulders down to a long wispy tail, all in solid
opaque colours; no legs, no weapon, no bow; the tip of the gown's tail is
the lowest thing in the image; simple shapes and very few details; clearly
a floating spirit, not an archer.
```

**Zombie** (`UNIT:GUARD`, standard unit 56 x 80):

```text
Subject: Zombie, a chunky cute big shambling zombie with a huge round head
about half of the figure's height and a wide stocky body in a braced
stance: pale blue-grey skin with a few stitched seams, sleepy droopy eyes
and a small lopsided grin, a tuft of dark slate hair, a big bright red
ragged smock with torn zigzag hems covering the chest, belly and legs down
to the shins, both arms stretched straight forward with big ivory-bandaged
hands, big dark slate-grey feet; no weapon, no shield; simple shapes and
very few details; clearly a slow heavy wall of a body, not a sword fighter.
```

**Necromancer** (`UNIT:CAPTAIN`, standard unit 56 x 80):

```text
Subject: Necromancer, a chunky cute old sorcerer with a huge round head
about half of the figure's height and a tiny sturdy body: a gaunt pale
blue-grey face with glowing pale blue eyes and a long ivory-white beard, a
big bright red pointed hood and a long bright red ragged robe with torn
zigzag hems down to the feet, a tall crooked dark slate-grey iron staff held
upright in the left hand, topped with a small ivory skull holding a cold
pale blue flame high above his head, the right hand raised with small pale
blue sparks, dark slate-grey shoes; no shield, no helmet, no sword; simple
shapes and very few details; clearly a spellcaster with a skull staff.
```

**Lich** (`UNIT:CATAPULT`, large unit 72 x 88):

```text
Subject: Lich, a chunky cute tall skeleton sorcerer king, clearly bigger
than a soldier: a huge round ivory skull head with glowing pale blue eye
sockets and a spiky dark slate-grey iron crown, a huge wide bright red
ragged royal robe with a tall stiff collar and torn zigzag hems spreading
out on both sides, thin ivory bone hands raised above the head holding up a
big round orb of cold pale blue flame, small ivory bone feet peeking out
under the hem; simple shapes and very few details; the feet and the robe's
hem are the lowest thing in the image; clearly a big spell-hurling caster,
not a war machine.
```

**Vampire** (`UNIT:KNIGHT`, large unit 72 x 88):

```text
Subject: Vampire, a chunky cute vampire count, clearly bigger and grander
than a soldier: a huge round head about half of his height with pale
ghost-blue skin, slicked-back black hair with a widow's peak, big pale blue
eyes and two tiny white fangs in a smug grin, a huge bright red
high-collared cape spread wide behind him like bat wings with pointed
scalloped edges, filling the whole width of the image, a bright red long
coat over a cream-white shirt, slate-grey trousers and pointed dark
slate-grey boots, a slim light grey iron rapier in the right hand; no horse,
no mount; simple shapes and very few details; the boots are the lowest
thing in the image; clearly a dashing noble, not an armoured knight.
```

**Abomination** (`UNIT:JUGGERNAUT`, giant unit 88 x 104):

```text
Subject: Abomination, a chunky cute giant stitched-together brute, a huge
hulking lump much wider and taller than a normal soldier: a big round head
sunk low between enormous shoulders, pale blue-grey patchwork skin with big
stitched seams and a few iron bolts, one eye bigger than the other and a
goofy underbite grin, one arm bigger than the other, big fists in dark iron
manacles with short broken iron chains, a huge bright red patchwork smock
with torn zigzag hems over the barrel belly and down to the knees, thick
legs and big dark slate-grey feet, wide braced stance; simple shapes and
very few details; clearly a giant, not a normal soldier.
```

**Grave marker** (new subject, for example `GRAVE`; unowned, resource-sized
about 40 x 40, no mask):

```text
Subject: a small grave marker: one short rounded headstone of weathered
light blue-grey stone with a small engraved ivory skull, leaning slightly,
with a tiny tuft of grey-green moss at its foot; small, low and calm, much
smaller than a unit.
```

Its recipe adds `negativeAddendum`: `person, character, skeleton, hand,
coffin, red`. A Grave has no owner and may share a tile with a unit of any
faction, so it carries no key colour and must stay readable, below the
unit, when a unit stands on it.

### Cities and villages

**Recommendation: Undead share the Human settlement art.** The runtime keys
city art by level only (`CITY:1`, `CITY:2`, `CITY:3` and the neutral
`SITE:VILLAGE` in `src/assets/chibi-art-v7.ts`), not by owner faction, and
a city changes owner when it is captured. Shared cities need no runtime
change, keep the owner mask the only sign of who holds a city, and never
swap a city's whole look on capture. The neutral village is unowned and
stays shared either way. Undead identity then lives in the units, the Grave
and the ability effects.

If the user prefers Undead city tiers, the runtime must key `CITY:*` art by
the owner's faction, and a captured city would change style on capture.
These draft lines would then apply, each recipe with the `negativeAddendum`
`soldier, person, character, skeleton, zombie, ghost, face`:

```text
Subject: a small level-1 spooky town: one short crooked round tower of
weathered grey stone with a bright red pointed roof, a small round window
glowing cold pale blue and a big red banner flag, and three chunky crooked
cottages with pale blue-grey stone walls and solid bright red pointed roofs
pressed around its foot, two small grey headstones; no wall; wide and
chunky, filling the whole width of the image. Buildings only.

Subject: a level-2 spooky town, clearly bigger than a small town: five
chunky crooked cottages with pale blue-grey stone walls and solid bright red
pointed roofs packed around a tall crooked square grey stone manor tower
with a big red banner flag, a low weathered grey stone wall with a dark
slate-grey iron gate across the front and one round crooked corner tower
with a bright red pointed roof; wide and chunky, filling the whole width of
the image. Buildings only.

Subject: a large level-3 spooky city, the biggest settlement: many chunky
crooked houses with pale blue-grey stone walls and bright red pointed roofs
packed inside a crenellated weathered grey stone ring wall with an iron
gate, two round crooked corner towers with bright red pointed roofs and a
tall central castle keep with pointed spires, small windows glowing cold
pale blue and a big red banner flag; wide and chunky, filling the whole
image. Buildings only.
```

### Ability effects (future subjects)

For the effects bead (`pulp_wars-vkq.14`); not part of the sample. The
chibi direction has no effect class yet, so their canvas and whether they
are rasters or code-drawn overlays are open. None of them is owned, so none
uses the key red, and none uses green, cyan or purple.

| Effect      | Draft idea                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------- |
| Wail        | concentric pale blue-white sound rings with a few wavy lines, spreading over the radius-2 area    |
| Lich splash | a burst of cold pale blue flame with small ivory sparks over the target and its eight neighbours  |
| Raise Dead  | two small ivory bone hands popping up beside a headstone, with pale blue wisps                    |
| Infect      | a small swirl of slate-grey and pale blue wisps with a stitched patch over the victim as it rises |
| Lifesteal   | pale blue wisps flowing from the target to the Vampire; never red, never blood                    |

## Roster notes

Canvas and class follow the mechanical role's subject in the
[asset inventory](../CHIBI_ASSET_INVENTORY.md).

| Role or building           | Canvas        | Owner colour on                           | Distinguishing silhouette                                                                     |
| -------------------------- | ------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Skeleton (`FIGHTER`)       | 56 x 80       | ragged tabard to the knees, helmet crest  | ivory skull head, thin bone limbs, notched iron sword, round iron shield                      |
| Ghoul (`RAIDER`)           | 72 x 88       | hooded cloak over head, back and hips     | low and wide on all fours, long arms, big claws, no weapon, no mount                          |
| Banshee (`MARKSMAN`)       | 56 x 80       | hooded shroud gown from shoulders to tail | floating, no legs, wispy tail, hands at cheeks, open wailing mouth                            |
| Zombie (`GUARD`)           | 56 x 80       | ragged smock to the shins                 | wide stocky body, both arms straight forward, no weapon or shield                             |
| Necromancer (`CAPTAIN`)    | 56 x 80       | pointed hood and full-length robe         | tall crooked iron staff with a skull and a pale blue flame, long beard                        |
| Lich (`CATAPULT`)          | 72 x 88       | wide royal robe with a tall collar        | tall crowned skull, orb of pale blue flame held overhead, robe spreading on both sides        |
| Vampire (`KNIGHT`)         | 72 x 88       | huge bat-wing cape and long coat          | cape spread wide like wings, black widow's-peak hair, rapier; no horse                        |
| Abomination (`JUGGERNAUT`) | 88 x 104      | patchwork smock over belly and knees      | giant stitched hulk, head sunk between shoulders, one arm bigger, manacles with broken chains |
| Patrol Boat, Battleship    | Human art     | Human art                                 | reused unchanged (spec section 3)                                                             |
| Grave marker               | about 40 x 40 | none (unowned)                            | small leaning rounded headstone with an engraved skull and a moss tuft                        |
| City 1–3, village          | Human art     | Human art                                 | shared (recommended); optional Undead tiers above                                             |

## Open questions for the user

These are the guesses in this draft. Each has a recommended answer.

1. **Cities.** Share the Human city and village art (recommended; no runtime
   change), or give Undead their own city tiers (the runtime must key city
   art by owner faction, and a captured city changes style)? The sample bead
   `pulp_wars-vkq.12` currently lists "Undead city tiers"; with shared
   cities its sample becomes Skeleton, Banshee and one more unit.
2. **Banshee and Lich feet.** The shared unit class fragment says "both feet
   visible; the feet are the lowest thing in the image". A floating Banshee
   with no legs contradicts it. Accept a per-recipe override (recommended),
   or give her small feet under the gown? The Lich keeps small feet under
   its robe.
3. **Vampire mount.** The Human Knight rides a horse; this draft makes the
   Vampire an unmounted count with a huge bat-wing cape, to read apart from
   the Knight and still fill the large canvas. Or should he ride a bony
   horse?
4. **Ghoul.** A lone ghoul on all fours in the large 72 x 88 canvas
   (draft), or a smaller upright ghoul on the standard canvas, or a ghoul
   riding a bony hound like the Human pony rider?
5. **Zombie.** Arms out and no shield (draft), or a coffin-lid tower shield
   like the Human Guard's (it would have to be owner red to keep the owner
   area, since it hides the smock)?
6. **Tone.** Grins, sleepy eyes and goofy faces on every unit: is this the
   right level of spooky, or should they be a little more menacing?
7. **Third secondary colour.** Grey-green moss accents (draft) or none, so
   the palette is only ivory and slate blue-grey?
8. **Grave marker.** Unowned and resource-sized (about 40 x 40) drawn under
   units, as drafted? Its exact placement on the tile belongs to the Grave
   marker UI bead.
9. **Shared direction wording.** [Chibi direction section
   4](../CHIBI_ART_DIRECTION.md#4-owner-colour) still says shields, boots and
   bows use browns, which contradicts this faction's never-brown rule (the
   point `pulp_wars-bi3` left open). Reword it as "colours that are clearly
   not red", in a separate change?

## Check before approval

- [x] The prompt fragment names no figure and no building.
- [x] Every material has a non-red, non-brown shading colour.
- [x] Every unit line puts red on a garment covering torso and legs.
- [x] Feet, hands, handles, stocks and shields have non-brown colours.
- [x] Every optional settlement line ends "Buildings only." and fills the
      width.
- [ ] The sample (Skeleton, Banshee, and City 1 if Undead cities are chosen)
      passes mask QA and reads apart from the Human set at zoom 0.75.
